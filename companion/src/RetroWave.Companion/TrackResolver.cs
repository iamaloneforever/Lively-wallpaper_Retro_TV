using System.Net.Http;
using System.Text.Json;
using RetroWave.Companion.Music;
namespace RetroWave.Companion;

public sealed class TrackResolver : IDisposable
{
    private readonly ProviderHttp http;
    private readonly IMusicProvider[] providers;
    private readonly SemaphoreSlim gate = new(1);
    private readonly Dictionary<string, (ResolutionResult Result, DateTimeOffset Expires)> cache = new();
    private readonly Dictionary<string, ProviderActivity> activities = new();
    public TrackResolver(HttpMessageHandler? handler = null)
    {
        http = new(handler);
        providers = [new ListenBrainzProvider(http), new MusicBrainzProvider(http), new SpotifyExperimentalProvider(http), new ACRCloudProvider(http), new SpotifyOfficialProvider(http), new AppleMetadataProvider(http)];
    }
    public TrackResolver(IMusicProvider[] providers) { http = new(); this.providers = providers; }
    public static string Match(JsonElement results, PlaybackSnapshot track) => TrackMatcher.Match(track, ListenBrainzProvider.Parse(results, track)).Match?.SpotifyId ?? "";
    public async Task<string> ResolveAsync(PlaybackSnapshot track, CancellationToken cancellation) => (await ResolveDetailedAsync(track, AppSettings.Load() with { ExternalConsent = true }, cancellation)).Match?.SpotifyId ?? "";
    public async Task<ResolutionResult> ResolveDetailedAsync(PlaybackSnapshot track, AppSettings settings, CancellationToken cancellation)
    {
        if (!settings.ExternalConsent) return new("External lookup disabled", null, 0, []);
        if (string.IsNullOrWhiteSpace(track.Title) || string.IsNullOrWhiteSpace(track.Artist)) return new("Incomplete native metadata", null, 0, []);
        var key = track.Identity + Math.Round(track.Duration) + JsonSerializer.Serialize(settings.Providers) + settings.ExperimentalConsent;
        await gate.WaitAsync(cancellation);
        try
        {
            if (cache.TryGetValue(key, out var hit) && hit.Expires > DateTimeOffset.UtcNow) return hit.Result with { FromCache = true, CacheEntries = cache.Count };
            var all = new List<CandidateScore>(); var errors = new List<string>(); TrackCandidate? recording = null; var ambiguous = false;
            foreach (var preference in settings.Providers.Where(p => p.Enabled))
            {
                var provider = providers.FirstOrDefault(p => p.Name == preference.Name);
                if (provider is null || !provider.Configured) { errors.Add(preference.Name + ": not configured"); activities[preference.Name] = new(preference.Name, "Not configured", "Configuration missing"); continue; }
                if (provider.Name == "Experimental Spotify" && !settings.ExperimentalConsent) continue;
                try
                {
                    var lastSuccess = activities.GetValueOrDefault(provider.Name)?.LastSuccessfulMatch;
                    activities[provider.Name] = new(provider.Name, "Searching catalogue", "", DateTimeOffset.UtcNow, lastSuccess);
                    var result = TrackMatcher.Match(track, await provider.SearchAsync(track, cancellation)); all.AddRange(result.Candidates);
                    ambiguous |= result.Status == "Match ambiguous";
                    activities[provider.Name] = activities[provider.Name] with { Status = result.Status, LastSuccessfulMatch = result.Match is not null ? DateTimeOffset.UtcNow : lastSuccess };
                    if (result.Match is { } candidate)
                    {
                        if (TrackMatcher.ValidSpotifyId(candidate.SpotifyId)) return Remember(result with { Candidates = all.ToArray() });
                        if (Guid.TryParse(candidate.Mbid, out _))
                        {
                            recording = candidate;
                            if (settings.Providers.Any(p => p.Name == "ListenBrainz" && p.Enabled))
                            {
                                var listenBrainz = providers.FirstOrDefault(p => p.Name == "ListenBrainz");
                                if (listenBrainz is not null)
                                {
                                    var mapped = TrackMatcher.Match(track with { Mbid = candidate.Mbid, Isrc = candidate.Isrc }, await listenBrainz.SearchAsync(track with { Mbid = candidate.Mbid }, cancellation)); all.AddRange(mapped.Candidates);
                                    if (mapped.Match is { } match && TrackMatcher.ValidSpotifyId(match.SpotifyId)) return Remember(mapped with { Match = match with { Mbid = candidate.Mbid, Isrc = candidate.Isrc }, Candidates = all.ToArray() });
                                }
                            }
                        }
                    }
                }
                catch (OperationCanceledException) when (cancellation.IsCancellationRequested) { throw; }
                catch (Exception ex) when (ex is HttpRequestException or JsonException or ProviderException or OperationCanceledException or InvalidOperationException)
                { var category = ex is ProviderException ? ex.Message : ex is OperationCanceledException ? "Timeout" : "Invalid response or network unavailable"; errors.Add(provider.Name + ": " + category); activities[provider.Name] = new(provider.Name, "Provider unavailable", category, DateTimeOffset.UtcNow, activities.GetValueOrDefault(provider.Name)?.LastSuccessfulMatch); }
            }
            return Remember(new(ambiguous ? "Match ambiguous" : errors.Count > 0 && all.Count == 0 ? "Provider unavailable" : "No Spotify ID", recording, recording is null ? 0 : TrackMatcher.Score(track, recording).Confidence, all.ToArray(), string.Join("; ", errors)));
            ResolutionResult Remember(ResolutionResult value)
            {
                value = value with { Providers = activities.Values.ToArray(), CacheEntries = Math.Min(256, cache.Count + 1) };
                cancellation.ThrowIfCancellationRequested();
                if (cache.Count >= 256) cache.Remove(cache.Keys.First());
                cache[key] = (value, DateTimeOffset.UtcNow.AddSeconds(TrackMatcher.ValidSpotifyId(value.Match?.SpotifyId ?? "") ? 21600 : 300)); return value;
            }
        }
        finally { gate.Release(); }
    }
    public void Dispose() { http.Dispose(); gate.Dispose(); }
}
