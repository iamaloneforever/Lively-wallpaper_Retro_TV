using System.Net;
using System.Collections.Concurrent;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
namespace RetroWave.Companion.Music;

public interface IMusicProvider
{
    string Name { get; }
    bool Configured { get; }
    Task<TrackCandidate[]> SearchAsync(PlaybackSnapshot track, CancellationToken cancellation);
}
public sealed class ProviderException(string category, HttpStatusCode? status = null) : Exception(category)
{
    public HttpStatusCode? Status { get; } = status;
}
public sealed class ProviderHttp(HttpMessageHandler? handler = null) : IDisposable
{
    private readonly HttpClient client = handler is null ? new() : new(handler);
    private readonly ConcurrentDictionary<string, DateTimeOffset> retryAfter = new();
    private readonly ConcurrentDictionary<string, SemaphoreSlim> hostGates = new();
    private DateTimeOffset musicBrainzRequest;
    public async Task<JsonDocument> GetAsync(string url, CancellationToken cancellation, string? bearer = null, bool webPlayer = false)
        => JsonDocument.Parse(await GetTextAsync(url, cancellation, bearer, webPlayer));
    public async Task<string> GetTextAsync(string url, CancellationToken cancellation, string? bearer = null, bool webPlayer = false)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.UserAgent.ParseAdd("RetroWave/4.0 (+https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV)");
        if (bearer is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
        if (webPlayer) request.Headers.Add("app-platform", "WebPlayer");
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation); timeout.CancelAfter(TimeSpan.FromSeconds(8));
        var host = request.RequestUri!.Host;
        var gate = hostGates.GetOrAdd(host, _ => new SemaphoreSlim(1));
        await gate.WaitAsync(timeout.Token);
        try
        {
            if (retryAfter.TryGetValue(host, out var until) && until > DateTimeOffset.UtcNow) throw new ProviderException("Rate limited");
            if (host == "musicbrainz.org")
            {
                var wait = musicBrainzRequest.AddMilliseconds(1100) - DateTimeOffset.UtcNow;
                if (wait > TimeSpan.Zero) await Task.Delay(wait, timeout.Token);
                musicBrainzRequest = DateTimeOffset.UtcNow;
            }
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                retryAfter[host] = response.Headers.RetryAfter?.Date ?? DateTimeOffset.UtcNow.Add(response.Headers.RetryAfter?.Delta ?? TimeSpan.FromMinutes(1));
                throw new ProviderException("Rate limited");
            }
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden) throw new ProviderException("Authentication or access denied", response.StatusCode);
            if (!response.IsSuccessStatusCode) throw new ProviderException("Service unavailable");
            using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
            using var buffer = new MemoryStream(); var bytes = new byte[8192]; int read;
            while ((read = await stream.ReadAsync(bytes, timeout.Token)) > 0)
            {
                if (buffer.Length + read > 2_000_000) throw new ProviderException("Response too large");
                buffer.Write(bytes, 0, read);
            }
            return System.Text.Encoding.UTF8.GetString(buffer.ToArray());
        }
        finally { gate.Release(); }
    }
    public void Dispose() { client.Dispose(); foreach (var gate in hostGates.Values) gate.Dispose(); }
}
internal static class JsonFields
{
    public static string Text(this JsonElement row, string key) => row.ValueKind == JsonValueKind.Object && row.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : "";
    public static double Number(this JsonElement row, string key) => row.ValueKind == JsonValueKind.Object && row.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number) && double.IsFinite(number) ? number : 0;
    public static IEnumerable<JsonElement> Rows(this JsonElement row, string key) => row.ValueKind == JsonValueKind.Object && row.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Array ? value.EnumerateArray().Take(100) : [];
    public static JsonElement Object(this JsonElement row, string key) => row.ValueKind == JsonValueKind.Object && row.TryGetProperty(key, out var value) ? value : default;
    public static string Query(string value) => Uri.EscapeDataString(value);
}
public sealed class ListenBrainzProvider(ProviderHttp http) : IMusicProvider
{
    public string Name => "ListenBrainz";
    public bool Configured => true;
    public async Task<TrackCandidate[]> SearchAsync(PlaybackSnapshot track, CancellationToken cancellation)
    {
        var byMbid = Guid.TryParse(track.Mbid, out _);
        var url = byMbid ? "https://labs.api.listenbrainz.org/spotify-id-from-mbid/json?recording_mbid=" + JsonFields.Query(track.Mbid)
            : $"https://labs.api.listenbrainz.org/spotify-id-from-metadata/json?artist_name={JsonFields.Query(track.Artist)}&track_name={JsonFields.Query(track.Title)}" + (track.Album.Length > 0 ? "&release_name=" + JsonFields.Query(track.Album) : "");
        using var json = await http.GetAsync(url, cancellation);
        return Parse(json.RootElement, track, byMbid);
    }
    public static TrackCandidate[] Parse(JsonElement root, PlaybackSnapshot track, bool byMbid = false)
    {
        if (root.ValueKind != JsonValueKind.Array) throw new ProviderException("Invalid response");
        return root.EnumerateArray().Take(100).SelectMany(row => row.Rows("spotify_track_ids").Where(id => id.ValueKind == JsonValueKind.String && TrackMatcher.ValidSpotifyId(id.GetString()!)).Select(id => new TrackCandidate(
            byMbid && row.Text("track_name").Length == 0 ? track.Title : row.Text("track_name"),
            byMbid && row.Text("artist_name").Length == 0 ? track.Artist : row.Text("artist_name"), row.Text("release_name"), 0, "ListenBrainz", id.GetString()!, byMbid ? track.Mbid : row.Text("recording_mbid")))).ToArray();
    }
}
public sealed class MusicBrainzProvider(ProviderHttp http) : IMusicProvider
{
    public string Name => "MusicBrainz";
    public bool Configured => true;
    public async Task<TrackCandidate[]> SearchAsync(PlaybackSnapshot track, CancellationToken cancellation)
    {
        static string Escape(string value) => value.Replace("\\", "\\\\").Replace("\"", "\\\"");
        var query = $"recording:\"{Escape(track.Title)}\" AND artist:\"{Escape(track.Artist)}\"";
        if (track.Duration > 0) query += $" AND dur:[{Math.Max(0, (long)(track.Duration * 1000) - 8000)} TO {(long)(track.Duration * 1000) + 8000}]";
        using var json = await http.GetAsync("https://musicbrainz.org/ws/2/recording/?fmt=json&limit=12&query=" + JsonFields.Query(query), cancellation);
        if (json.RootElement.Object("recordings").ValueKind != JsonValueKind.Array) throw new ProviderException("Invalid response");
        var candidates = json.RootElement.Rows("recordings").Select(row => new TrackCandidate(row.Text("title"), string.Join(" ", row.Rows("artist-credit").Select(a => a.Text("name"))),
            row.Rows("releases").FirstOrDefault().Text("title"), row.Number("length") / 1000, Name, Mbid: row.Text("id"), Isrc: row.Rows("isrcs").FirstOrDefault().ValueKind == JsonValueKind.String ? row.Rows("isrcs").First().GetString()! : "", Disambiguation: row.Text("disambiguation"))).ToArray();
        var recording = TrackMatcher.Match(track, candidates).Match;
        if (track.Duration > 0 && recording is not null && recording.Isrc.Length == 0 && Guid.TryParse(recording.Mbid, out _))
        {
            try
            {
                using var detail = await http.GetAsync("https://musicbrainz.org/ws/2/recording/" + recording.Mbid + "?fmt=json&inc=isrcs+artist-credits+releases", cancellation);
                if (detail.RootElement.Text("id") == recording.Mbid)
                {
                    var isrc = detail.RootElement.Rows("isrcs").FirstOrDefault();
                    if (isrc.ValueKind == JsonValueKind.String) candidates = candidates.Select(c => c.Mbid == recording.Mbid ? c with { Isrc = isrc.GetString()! } : c).ToArray();
                }
            }
            catch (OperationCanceledException) when (cancellation.IsCancellationRequested) { throw; }
            catch (Exception ex) when (ex is ProviderException or HttpRequestException or JsonException or OperationCanceledException) { /* Search identity remains useful if optional enrichment is unavailable. */ }
        }
        return candidates;
    }
}
public sealed class AppleMetadataProvider(ProviderHttp http) : IMusicProvider
{
    public string Name => "Apple iTunes";
    public bool Configured => true;
    public async Task<TrackCandidate[]> SearchAsync(PlaybackSnapshot track, CancellationToken cancellation)
    {
        using var json = await http.GetAsync("https://itunes.apple.com/search?entity=song&limit=12&term=" + JsonFields.Query(track.Title + " " + track.Artist), cancellation);
        if (json.RootElement.Object("results").ValueKind != JsonValueKind.Array) throw new ProviderException("Invalid response");
        return json.RootElement.Rows("results").Select(r => new TrackCandidate(r.Text("trackName"), r.Text("artistName"), r.Text("collectionName"), r.Number("trackTimeMillis") / 1000, Name, CatalogueId: r.Number("trackId") > 0 ? r.Number("trackId").ToString("0", System.Globalization.CultureInfo.InvariantCulture) : "")).ToArray();
    }
}
public sealed class ACRCloudProvider(ProviderHttp http, Func<string>? credential = null) : IMusicProvider
{
    public string Name => "ACRCloud";
    private string Token => credential?.Invoke() ?? CredentialStore.Get(Name);
    public bool Configured => Token.Length > 0;
    public async Task<TrackCandidate[]> SearchAsync(PlaybackSnapshot track, CancellationToken cancellation)
    {
        var query = track.Isrc.Length > 0 ? "isrc=" + JsonFields.Query(track.Isrc) : "format=json&query=" + JsonFields.Query(JsonSerializer.Serialize(new { track = track.Title, artists = new[] { track.Artist } }));
        using var json = await http.GetAsync("https://eu-api-v2.acrcloud.com/api/external-metadata/tracks?platforms=spotify&" + query, cancellation, Token);
        if (json.RootElement.Object("data").ValueKind != JsonValueKind.Array) throw new ProviderException("Invalid response");
        return json.RootElement.Rows("data").SelectMany(r => r.Object("external_metadata").Rows("spotify").Select(s => new TrackCandidate(r.Text("name"), string.Join(" ", r.Rows("artists").Select(a => a.Text("name"))), r.Object("album").Text("name"), r.Number("duration_ms") / 1000, Name, s.Text("id"), Isrc: r.Text("isrc")))).ToArray();
    }
}
public sealed class SpotifyOfficialProvider(ProviderHttp http, Func<CancellationToken, Task<string>>? accessToken = null) : IMusicProvider
{
    public string Name => "Official Spotify";
    public bool Configured => accessToken is not null || (CredentialStore.Get("Spotify client ID").Length > 0 && CredentialStore.Get("Spotify refresh token").Length > 0);
    public async Task<TrackCandidate[]> SearchAsync(PlaybackSnapshot track, CancellationToken cancellation)
    {
        var token = await (accessToken?.Invoke(cancellation) ?? SpotifyOAuth.AccessTokenAsync(cancellation));
        var query = track.Isrc.Length > 0 ? "isrc:" + track.Isrc : $"track:{track.Title} artist:{track.Artist}";
        using var json = await http.GetAsync("https://api.spotify.com/v1/search?type=track&limit=10&q=" + JsonFields.Query(query), cancellation, token);
        if (json.RootElement.Object("tracks").Object("items").ValueKind != JsonValueKind.Array) throw new ProviderException("Invalid response");
        return json.RootElement.Object("tracks").Rows("items").Select(r => new TrackCandidate(r.Text("name"), string.Join(" ", r.Rows("artists").Select(a => a.Text("name"))), r.Object("album").Text("name"), r.Number("duration_ms") / 1000, Name, r.Text("id"), Isrc: r.Object("external_ids").Text("isrc"))).ToArray();
    }
}
public sealed class SpotifyExperimentalProvider(ProviderHttp http) : IMusicProvider
{
    public string Name => "Experimental Spotify";
    public bool Configured => true;
    private string token = "";
    private DateTimeOffset expires;
    // This is an API identifier, not copied AGPL implementation. Rotation is a normal unavailable state.
    private const string QueryHash = "eff59fa0a3d026b88b56fddbcf4bdfa16a186b8175a5c1a358c072e053c2e5b0";
    public async Task<TrackCandidate[]> SearchAsync(PlaybackSnapshot track, CancellationToken cancellation)
    {
        for (var attempt = 0; attempt < 2; attempt++)
        {
            if (expires <= DateTimeOffset.UtcNow.AddMinutes(1))
            {
                var html = await http.GetTextAsync("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC", cancellation);
                var match = Regex.Match(html, "<script[^>]*id=[\"']__NEXT_DATA__[\"'][^>]*>(.*?)</script>", RegexOptions.Singleline, TimeSpan.FromSeconds(1));
                if (!match.Success) throw new ProviderException("Anonymous session unavailable");
                using var json = JsonDocument.Parse(match.Groups[1].Value);
                var session = json.RootElement.Object("props").Object("pageProps").Object("state").Object("settings").Object("session");
                token = session.Text("accessToken");
                var expiration = session.Number("accessTokenExpirationTimestampMs");
                if (token.Length == 0 || expiration < DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() || expiration > 253402300799999) throw new ProviderException("Anonymous session unavailable");
                expires = DateTimeOffset.FromUnixTimeMilliseconds((long)expiration);
            }
            var variables = JsonSerializer.Serialize(new { searchTerm = MetadataNormalizer.Normalize(track.Title) + " " + track.Artist, offset = 0, limit = 12, numberOfTopResults = 5, includeAudiobooks = false, includePreReleases = true, includeAlbumPreReleases = false, includeAuthors = false, includeEpisodeContentRatingsV2 = false });
            var extensions = JsonSerializer.Serialize(new { persistedQuery = new { version = 1, sha256Hash = QueryHash } });
            try
            {
                using var result = await http.GetAsync("https://api-partner.spotify.com/pathfinder/v1/query?operationName=searchDesktop&variables=" + JsonFields.Query(variables) + "&extensions=" + JsonFields.Query(extensions), cancellation, token, true);
                if (result.RootElement.Object("errors").ValueKind == JsonValueKind.Array) throw new ProviderException("Undocumented API changed or access restricted");
                var tracks = result.RootElement.Object("data").Object("searchV2").Object("tracksV2");
                if (tracks.Object("items").ValueKind != JsonValueKind.Array) throw new ProviderException("Undocumented API changed");
                return tracks.Rows("items").Select(r => r.Object("item").Object("data")).Select(r => new TrackCandidate(r.Text("name"), string.Join(" ", r.Object("artists").Rows("items").Select(a => a.Object("profile").Text("name"))), r.Object("albumOfTrack").Text("name"), r.Object("duration").Number("totalMilliseconds") / 1000, Name, r.Text("id").Length > 0 ? r.Text("id") : r.Text("uri").Split(':').Last())).Where(r => TrackMatcher.ValidSpotifyId(r.SpotifyId)).ToArray();
            }
            catch (ProviderException ex) when (attempt == 0 && ex.Status == HttpStatusCode.Unauthorized) { token = ""; expires = default; }
        }
        throw new ProviderException("Anonymous access denied");
    }
}
