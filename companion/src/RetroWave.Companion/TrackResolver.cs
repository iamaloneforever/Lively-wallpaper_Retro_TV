using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace RetroWave.Companion;

// Optional documented public lookup. Never obtains Spotify tokens or calls private player APIs.
public sealed class TrackResolver : IDisposable
{
    private readonly HttpClient client;
    private readonly Dictionary<string, (string Id, DateTimeOffset Expires)> cache = new();
    private readonly SemaphoreSlim gate = new(1);
    private DateTimeOffset lastRequest;
    public TrackResolver(HttpMessageHandler? handler = null)
    {
        client = handler is null ? new HttpClient() : new HttpClient(handler);
        client.Timeout = TimeSpan.FromSeconds(4);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("RetroWaveTV/2.0 (+https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV)");
    }
    private static string Normalize(string value) => Regex.Replace(value.Normalize().ToLowerInvariant(), @"[^\p{L}\p{N}]", "");
    public static string Match(JsonElement results, PlaybackSnapshot track)
    {
        if (results.ValueKind != JsonValueKind.Array) return "";
        var candidates = results.EnumerateArray().Where(row => row.ValueKind == JsonValueKind.Object &&
            Equal(row, "track_name", track.Title) && Equal(row, "artist_name", track.Artist) && Equal(row, "release_name", track.Album)).ToArray();
        if (candidates.Length != 1 || !candidates[0].TryGetProperty("spotify_track_ids", out var ids) || ids.ValueKind != JsonValueKind.Array) return "";
        return ids.EnumerateArray().Where(id => id.ValueKind == JsonValueKind.String).Select(id => id.GetString()!)
            .FirstOrDefault(id => Regex.IsMatch(id, "^[A-Za-z0-9]{22}$")) ?? "";
    }
    private static bool Equal(JsonElement row, string key, string value) => row.TryGetProperty(key, out var field) && field.ValueKind == JsonValueKind.String && Normalize(field.GetString()!) == Normalize(value);
    public async Task<string> ResolveAsync(PlaybackSnapshot track, CancellationToken cancellation)
    {
        if (string.IsNullOrWhiteSpace(track.Title) || string.IsNullOrWhiteSpace(track.Artist) || string.IsNullOrWhiteSpace(track.Album) || track.Duration <= 0) return "";
        var key = track.Identity + Math.Round(track.Duration);
        await gate.WaitAsync(cancellation);
        try
        {
            if (cache.TryGetValue(key, out var found) && found.Expires > DateTimeOffset.UtcNow) return found.Id;
            var delay = TimeSpan.FromMilliseconds(1100) - (DateTimeOffset.UtcNow - lastRequest);
            if (delay > TimeSpan.Zero) await Task.Delay(delay, cancellation);
            lastRequest = DateTimeOffset.UtcNow;
            var query = $"artist_name={Uri.EscapeDataString(track.Artist)}&track_name={Uri.EscapeDataString(track.Title)}&release_name={Uri.EscapeDataString(track.Album)}";
            string id = "";
            try
            {
                using var response = await client.GetAsync("https://labs.api.listenbrainz.org/spotify-id-from-metadata/json?" + query, cancellation);
                if (response.IsSuccessStatusCode && response.Content.Headers.ContentLength is not > 1_000_000)
                {
                    using var stream = await response.Content.ReadAsStreamAsync(cancellation);
                    using var bounded = new MemoryStream();
                    var buffer = new byte[8192]; int count;
                    while ((count = await stream.ReadAsync(buffer, cancellation)) > 0)
                    {
                        if (bounded.Length + count > 1_000_000) throw new InvalidDataException("Catalogue response too large.");
                        bounded.Write(buffer, 0, count);
                    }
                    using var json = JsonDocument.Parse(bounded.ToArray()); id = Match(json.RootElement, track);
                }
            }
            catch (Exception ex) when (ex is HttpRequestException or JsonException or InvalidDataException or TaskCanceledException && !cancellation.IsCancellationRequested) { /* Negative cache; no personal metadata in logs. */ }
            if (cache.Count >= 256) cache.Clear();
            cache[key] = (id, DateTimeOffset.UtcNow.AddSeconds(id.Length > 0 ? 21600 : 300));
            return id;
        }
        finally { gate.Release(); }
    }
    public void Dispose() { client.Dispose(); gate.Dispose(); }
}
