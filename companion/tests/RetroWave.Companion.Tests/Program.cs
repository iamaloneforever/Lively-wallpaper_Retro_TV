using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using RetroWave.Companion;

var checks = 0;
void Check(bool condition, string name) { if (!condition) throw new Exception(name); checks++; Console.WriteLine("PASS " + name); }
var now = DateTimeOffset.UtcNow;
Check(PlaybackSnapshot.TimelinePosition(4, 20, true, 2, now.AddSeconds(-2), now) == 8, "native playback rate extrapolation");
Check(PlaybackSnapshot.TimelinePosition(4, 20, false, 2, now.AddSeconds(-2), now) == 4, "pause freezes playback");
Check(PlaybackSnapshot.TimelinePosition(1, 20, true, 1, now, now) == 1, "backward seek resets native anchor");
Check(PlaybackSnapshot.TimelinePosition(19, 20, true, 1, now.AddSeconds(-5), now) == 20, "duration clamp");
Check(PlaybackSnapshot.TimelinePosition(4, 20, true, 1, DateTimeOffset.MinValue, now) == 4, "missing native timestamp does not jump to end");
var track = new PlaybackSnapshot { Title = "Test song", Artist = "Test artist", Album = "Test album", Duration = 180 };
var spotify = track with { Player = "Spotify.exe", IsPlaying = false };
foreach (var player in new[] { "TIDAL.exe", "AppleMusic.exe", "MusicBee.exe", "wmplayer.exe", "chrome.exe", "firefox.exe", "UnknownPlayer.exe" })
{
    var other = track with { Player = player, IsPlaying = true };
    Check(SessionSelection.Select(spotify, new[] { spotify, other }, s => s.IsPlaying)?.Player == player, $"{player} eligible without a player allowlist");
    Check(SessionSelection.Select(other, new[] { spotify with { IsPlaying = true }, other }, s => s.IsPlaying)?.Player == player, $"current playing {player} preferred over Spotify");
}
Check(SessionSelection.Select<PlaybackSnapshot>(null, [], s => s.IsPlaying) is null, "no media session handled");
var row = "{\"track_name\":\"Test song\",\"artist_name\":\"Test artist\",\"release_name\":\"Test album\",\"spotify_track_ids\":[\"invalid\",\"aaaaaaaaaaaaaaaaaaaaaa\"]}";
using (var result = JsonDocument.Parse("[" + row + "]"))
{
    Check(TrackResolver.Match(result.RootElement, track) == new string('a', 22), "documented catalogue match");
    Check(TrackResolver.Match(result.RootElement, track with { Artist = "Other" }) == "", "different artist rejected");
    Check(TrackResolver.Match(result.RootElement, track with { Album = "Other" }) == "", "different album rejected");
}
using (var result = JsonDocument.Parse("[" + row + "," + row + "]")) Check(TrackResolver.Match(result.RootElement, track) == "", "competing catalogue rows rejected");
var handler = new FixtureHandler("[" + row + "]");
using (var resolver = new TrackResolver(handler))
{
    Check(await resolver.ResolveAsync(track, CancellationToken.None) == new string('a', 22), "resolver HTTP contract");
    await resolver.ResolveAsync(track, CancellationToken.None); Check(handler.Calls == 1, "matching catalogue result cached");
    await resolver.ResolveAsync(track with { Album = "" }, CancellationToken.None); Check(handler.Calls == 1, "incomplete metadata stays local");
}
Check(LoopbackServer.IsAllowed("127.0.0.1:43821", "https://iamaloneforever.github.io"), "wallpaper origin allowed");
Check(!LoopbackServer.IsAllowed("127.0.0.1:43821", "https://evil.example"), "foreign origin denied");
Check(!LoopbackServer.IsAllowed("evil.example:43821", "https://iamaloneforever.github.io"), "DNS rebinding host denied");
Check(!LoopbackServer.IsAllowed("127.0.0.1:43821", ""), "missing origin denied");
using (var cancellation = new CancellationTokenSource())
using (var http = new HttpClient())
{
    const int testPort = 43829;
    var server = new LoopbackServer("fixture-token", testPort).RunAsync(() => track with { Position = 12, Thumbnail = "cover", CapturedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }, cancellation.Token);
    async Task<HttpResponseMessage> Request(string? origin, string method = "GET", string? host = null)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), $"http://127.0.0.1:{testPort}/now-playing");
        if (origin is not null) request.Headers.Add("Origin", origin);
        request.Headers.Add("X-RetroWave-Key", "fixture-token");
        if (host is not null) request.Headers.Host = host;
        return await http.SendAsync(request);
    }
    using (var response = await Request("https://iamaloneforever.github.io"))
    {
        var body = await response.Content.ReadAsStringAsync();
        Check(response.IsSuccessStatusCode && body.Contains("Test song"), "real loopback HTTP snapshot");
        Check(!body.Contains("cover"), "clock polls avoid retransmitting cover artwork");
        Check(response.Headers.GetValues("Access-Control-Allow-Origin").Single() == "https://iamaloneforever.github.io", "HTTP allows only matching origin");
    }
    using (var response = await Request("https://evil.example")) Check(response.StatusCode == HttpStatusCode.Forbidden, "foreign HTTP origin rejected");
    using (var response = await Request(null)) Check(response.StatusCode == HttpStatusCode.Forbidden, "originless HTTP requests rejected");
    using (var response = await Request("https://iamaloneforever.github.io", host: "evil.example")) Check(response.StatusCode == HttpStatusCode.Forbidden, "HTTP rebinding rejected");
    using (var response = await Request("https://iamaloneforever.github.io", "OPTIONS")) Check(response.IsSuccessStatusCode && response.Headers.GetValues("Access-Control-Allow-Private-Network").Single() == "true", "private network preflight supported");
    using (var response = await Request("https://iamaloneforever.github.io", "POST")) Check(response.StatusCode == HttpStatusCode.NotFound, "HTTP cannot control playback or setup");
    using (var request = new HttpRequestMessage(HttpMethod.Get, $"http://127.0.0.1:{testPort}/now-playing"))
    {
        request.Headers.Add("Origin", "https://iamaloneforever.github.io");
        using var response = await http.SendAsync(request); Check(response.StatusCode == HttpStatusCode.Forbidden, "origin alone cannot read private playback metadata");
    }
    cancellation.Cancel(); try { await server; } catch (OperationCanceledException) { }
}
var root = Path.Combine(Path.GetFullPath("artifacts"), "test-install-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);
try
{
    var library = Path.Combine(root, "library"); var installation = Path.Combine(root, "installed");
    var report = DiagnosticReport.FromSnapshot(true, true, "Connected", 3, "available", track with { Thumbnail = "PRIVATE_ARTWORK", TrackId = "PRIVATE_KEY", Position = 12, Sequence = 42 });
    var reportJson = report.Serialize();
    Check(!reportJson.Contains("Test song") && !reportJson.Contains("Test artist") && !reportJson.Contains("PRIVATE_"), "diagnostic reports exclude private metadata and credentials");
    Check(report.Position == 12 && report.Sequence == 42 && report.Sessions == 3, "debugger report retains usable timing and session evidence");
    var logPath = Path.Combine(root, "log.txt");
    File.WriteAllText(logPath, new string('x', 256 * 1024 + 1));
    DiagnosticLog.Append(logPath, "worker_started");
    Check(File.Exists(logPath + ".previous") && new FileInfo(logPath).Length < 1024, "bounded diagnostic log rotates");
    var installer = new WallpaperInstaller(installation, library);
    var template = File.ReadAllText("lively/LivelyInfo.json");
    var first = installer.Install(template, [1, 2, 3], true, false);
    Check(first.Created && File.Exists(Path.Combine(first.Entry, "LivelyInfo.json")), "Lively package installed");
    var second = installer.Install(template, [1, 2, 3], true, false);
    Check(second.Entry == first.Entry && Directory.GetDirectories(Path.Combine(library, "wallpapers")).Length == 1, "repair does not duplicate wallpaper");
    using (var metadata = JsonDocument.Parse(File.ReadAllText(Path.Combine(first.Entry, "LivelyInfo.json"))))
    {
        Check(metadata.RootElement.GetProperty("Type").GetInt32() == 3 && metadata.RootElement.GetProperty("FileName").GetString() == WallpaperInstaller.WallpaperUrl + "#bridge=" + first.BridgeToken, "real URL wallpaper schema with automatic pairing");
        Check(metadata.RootElement.GetProperty("Arguments").GetString() == WallpaperInstaller.Arguments, "audio media pause flags automatically retained");
    }
    File.WriteAllText(Path.Combine(first.Entry, "user-note.txt"), "keep");
    installer.Uninstall(); Check(File.Exists(Path.Combine(first.Entry, "user-note.txt")), "uninstall keeps user additions");
    var reinstall = installer.Install(template, [], false, false);
    Check(reinstall.Entry != first.Entry && File.Exists(Path.Combine(first.Entry, "user-note.txt")), "reinstall preserves files retained by uninstall");
    installer.Uninstall();
    File.Delete(Path.Combine(first.Entry, "user-note.txt")); Directory.Delete(first.Entry);
    var existing = Path.Combine(library, "wallpapers", "existing"); Directory.CreateDirectory(existing);
    var original = "{\"Title\":\"My TV\",\"Author\":\"Me\",\"FileName\":\"https://iamaloneforever.github.io/Lively-wallpaper_Retro_TV/\",\"Type\":3,\"Arguments\":\"--audio false --pause-event false\"}";
    File.WriteAllText(Path.Combine(existing, "LivelyInfo.json"), original);
    var adopted = installer.Install(template, [], false, false);
    Check(adopted.Entry == existing && !adopted.Created, "existing hosted wallpaper reused");
    Check(File.ReadAllText(Path.Combine(existing, "LivelyInfo.json")).Contains("My TV"), "existing identity preserved");
    installer.Install(template, [], true, false); installer.Uninstall();
    Check(File.ReadAllText(Path.Combine(existing, "LivelyInfo.json")) == original, "repair and uninstall restore original host metadata");
    installer.Install(template, [], true, false); File.AppendAllText(Path.Combine(existing, "LivelyInfo.json"), " "); installer.Uninstall();
    Check(File.ReadAllText(Path.Combine(existing, "LivelyInfo.json")) != original, "uninstall respects edits made after setup");
    var rejected = false;
    try { WallpaperInstaller.RequireChild(library, Path.Combine(root, "outside", "LivelyInfo.json")); } catch (InvalidDataException) { rejected = true; }
    Check(rejected, "installation journal cannot escape owning library");
}
finally { Directory.Delete(root, true); } // Absolute, generated test directory strictly beneath artifacts.
Console.WriteLine($"{checks} companion contract checks passed.");

sealed class FixtureHandler(string json) : HttpMessageHandler
{
    public int Calls { get; private set; }
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Calls++;
        if (request.RequestUri!.Host != "labs.api.listenbrainz.org") throw new Exception("Unexpected API host.");
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
    }
}
