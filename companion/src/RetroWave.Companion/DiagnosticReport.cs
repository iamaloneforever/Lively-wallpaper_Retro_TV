using System.Net.Http;
using System.Text.Json;
using Windows.Media.Control;
namespace RetroWave.Companion;

// Reports deliberately exclude titles, artists, albums, artwork and pairing tokens.
public sealed record DiagnosticReport(bool Installed, bool Enabled, string Bridge, string Media, int Sessions,
    double Position, double Duration, double Rate, long Sequence, long SnapshotAgeMs, string Native, DateTimeOffset Captured)
{
    public static async Task<DiagnosticReport> CaptureAsync(CancellationToken cancellation = default)
    {
        var state = new WallpaperInstaller(CompanionRuntime.Root, "").ReadState();
        var sessions = 0; var native = "available";
        try
        {
            var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(2), cancellation);
            sessions = manager.GetSessions().Count;
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !cancellation.IsCancellationRequested) { native = ex.GetType().Name; }
        var value = new PlaybackSnapshot(); var bridge = state is null ? "Not installed: run RetroWave-Setup.exe" : !state.Companion ? "Disabled in setup" : "Disconnected: click Start / restart";
        if (state?.Companion == true)
        {
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
                using var request = new HttpRequestMessage(HttpMethod.Get, "http://127.0.0.1:43821/now-playing");
                request.Headers.Add("Origin", "https://iamaloneforever.github.io");
                request.Headers.Add("X-RetroWave-Key", state.BridgeToken);
                using var response = await http.SendAsync(request, cancellation);
                if (response.IsSuccessStatusCode)
                {
                    value = JsonSerializer.Deserialize<PlaybackSnapshot>(await response.Content.ReadAsStringAsync(cancellation), PlaybackSnapshot.Json) ?? new();
                    bridge = "Connected (authenticated)";
                }
                else bridge = "HTTP " + (int)response.StatusCode + ": run setup to repair pairing";
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                cancellation.ThrowIfCancellationRequested();
                bridge = "Disconnected: " + ex.GetType().Name;
            }
        }
        return FromSnapshot(state is not null, state?.Companion == true, bridge, sessions, native, value);
    }
    public static DiagnosticReport FromSnapshot(bool installed, bool enabled, string bridge, int sessions, string native, PlaybackSnapshot value)
        => new(installed, enabled, bridge, value.Status, sessions, value.Position, value.Duration, value.Rate, value.Sequence,
            value.CapturedAtUnixMs > 0 ? Math.Max(0, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - value.CapturedAtUnixMs) : -1, native, DateTimeOffset.UtcNow);
    public string Serialize() => JsonSerializer.Serialize(this, new JsonSerializerOptions(PlaybackSnapshot.Json) { WriteIndented = true });
    public void Save(string path) { Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!); File.WriteAllText(path, Serialize()); }
}
