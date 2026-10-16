using System.Net.Http;
using System.Text.Json;
using SpicyBond.Companion.Music;
namespace SpicyBond.Companion;

public sealed class TrackResolver : IDisposable
{
    private readonly ProviderHttp http;
    private readonly IMusicProvider[] providers;
    private readonly SemaphoreSlim gate = new(1);
    private readonly Dictionary<string, (ResolutionResult Result, DateTimeOffset Expires)> cache = new();
    private readonly Dictionary<string, (GenreMetadata Value, DateTimeOffset Expires)> genreCache = new();
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
            var all = new List<CandidateScore>(); var errors = new List<string>(); TrackCandidate? recording = null; var ambiguous = false; string[] matchedGenres = []; var genreSource = "";
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
                        if (candidate.Genres.Length > 0) { matchedGenres = candidate.Genres; genreSource = provider.Name + " recording"; }
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
                                    if (mapped.Match is { } match && TrackMatcher.ValidSpotifyId(match.SpotifyId)) return Remember(mapped with { Match = match with { Mbid = candidate.Mbid, Isrc = candidate.Isrc, Genres = candidate.Genres }, Candidates = all.ToArray() });
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
                var genres = value.Match?.Genres is { Length: > 0 } supplied ? supplied : matchedGenres;
                value = value with { Genres = genres, GenreSource = genres.Length > 0 ? genreSource : "", Providers = activities.Values.ToArray(), CacheEntries = Math.Min(256, cache.Count + 1) };
                cancellation.ThrowIfCancellationRequested();
                if (cache.Count >= 256) cache.Remove(cache.Keys.First());
                cache[key] = (value, DateTimeOffset.UtcNow.AddSeconds(TrackMatcher.ValidSpotifyId(value.Match?.SpotifyId ?? "") ? 21600 : 300)); return value;
            }
        }
        finally { gate.Release(); }
    }
    // Optional genre enrichment uses only enabled, existing providers and the same consent boundary.
    // Its cache is separate from recording identity: a missing genre must not invalidate a Spotify match.
    public async Task<string[]> ResolveGenresAsync(PlaybackSnapshot track, ResolutionResult result, AppSettings settings, CancellationToken cancellation)
        => (await ResolveGenreMetadataAsync(track, result, settings, cancellation)).Genres;
    public async Task<GenreMetadata> ResolveGenreMetadataAsync(PlaybackSnapshot track, ResolutionResult result, AppSettings settings, CancellationToken cancellation)
    {
        if (track.Genres.Length > 0) return new(track.Genres, "Windows media", "Genre supplied by the player.");
        if (!settings.ExternalConsent) return new([], Status: "Enable external catalogue matching in companion Settings to look up missing genres.");
        if (result.Genres.Length > 0) return new(result.Genres, result.GenreSource.Length > 0 ? result.GenreSource : "Catalogue recording", "Genre supplied by the recording catalogue.");
        if (string.IsNullOrWhiteSpace(track.Title) || string.IsNullOrWhiteSpace(track.Artist)) return new([], Status: "Waiting for song title and artist.");
        var enabled = providers.Where(p => p.Configured && (p.Name is "MusicBrainz" or "Apple iTunes") && settings.Providers.Any(s => s.Name == p.Name && s.Enabled)).ToArray();
        if (enabled.Length == 0) return new([], Status: "Enable MusicBrainz or Apple iTunes in Music Finder to look up missing genres.");
        var key = track.Identity + Math.Round(track.Duration) + JsonSerializer.Serialize(settings.Providers);
        await gate.WaitAsync(cancellation);
        try
        {
            if (genreCache.TryGetValue(key, out var hit) && hit.Expires > DateTimeOffset.UtcNow) return hit.Value;
            var resolved = new GenreMetadata([], Status: "No genre found in the enabled catalogues; using the default theme.");
            foreach (var provider in enabled)
            {
                try
                {
                    var previous = result.Candidates.Where(c => c.Candidate.Provider == provider.Name).Select(c => c.Candidate).ToArray();
                    var rows = previous.Length > 0 ? previous : await provider.SearchAsync(track, cancellation);
                    var match = TrackMatcher.Match(track, rows).Match;
                    if (match is not null && match.Genres.Length > 0) { resolved = new(match.Genres, provider.Name + " recording", "Genre supplied by the recording catalogue."); break; }
                    // Searching recordings did not also search artist tags. Do not skip this fallback.
                    if (provider is IArtistGenreProvider artistProvider)
                    {
                        var fallback = await artistProvider.ResolveArtistGenresAsync(track.Artist, cancellation);
                        if (fallback.Genres.Length > 0) { resolved = fallback; break; }
                    }
                }
                catch (OperationCanceledException) when (cancellation.IsCancellationRequested) { throw; }
                catch (Exception ex) when (ex is HttpRequestException or JsonException or ProviderException or OperationCanceledException or InvalidOperationException)
                { resolved = new([], Status: "Genre lookup is unavailable. Check the enabled providers in Music Finder."); }
            }
            cancellation.ThrowIfCancellationRequested();
            if (genreCache.Count >= 256) genreCache.Remove(genreCache.Keys.First());
            genreCache[key] = (resolved, DateTimeOffset.UtcNow.AddSeconds(resolved.Genres.Length > 0 ? 21600 : 300));
            return resolved;
        }
        finally { gate.Release(); }
    }

    // Interactive correction returns alternatives instead of stopping at the first accepted match.
    public async Task<MusicSearchResult> SearchCandidatesAsync(PlaybackSnapshot native, string title, string artist, AppSettings settings, CancellationToken cancellation)
    {
        var popularity = settings.Providers.GroupBy(p => p.Name).ToDictionary(p => p.Key, p => AppSettings.NormalizePopularity(p.First().Popularity));
        popularity["LRCLIB"] = AppSettings.NormalizePopularity(settings.LrcLibPopularity);
        MusicSearchResult Result(TrackCandidate[] candidates, string[] queries, string detail) => new(native.TrackKey, candidates, queries, detail) { SourcePopularity = popularity };
        if (!settings.ExternalConsent) return Result([], [], "Enable external catalogue matching in the companion Settings.");
        if (title.Trim().Length is < 2 or > 512 || artist.Length > 512) return Result([], [], "Enter a song name between 2 and 512 characters.");
        var search = native with { Title = title.Trim(), Artist = artist.Trim(), Album = "", Duration = 0, TrackId = "", Mbid = "", Isrc = "" };
        // Start every enabled source before awaiting any; one slow catalogue cannot starve later ones.
        var tasks = settings.Providers.Where(p => p.Enabled).Select(async preference =>
        {
            var provider = providers.FirstOrDefault(p => p.Name == preference.Name);
            if (provider is null || !provider.Configured) return (Candidates: Array.Empty<TrackCandidate>(), Query: "", Error: preference.Name + ": not configured.");
            if (provider.Name == "Experimental Spotify" && !settings.ExperimentalConsent) return (Candidates: Array.Empty<TrackCandidate>(), Query: "", Error: provider.Name + ": experimental consent is disabled.");
            var query = provider.Name + ": " + (provider.Name == "Experimental Spotify" ? MetadataNormalizer.Normalize(search.Title) : search.Title) + (search.Artist.Length > 0 ? " — " + search.Artist : "");
            using var budget = CancellationTokenSource.CreateLinkedTokenSource(cancellation); budget.CancelAfter(TimeSpan.FromSeconds(16));
            try
            {
                var rows = await provider.SearchAsync(search, budget.Token);
                var candidates = rows.Where(c => !string.IsNullOrWhiteSpace(c.Title) && !string.IsNullOrWhiteSpace(c.Artist) &&
                    (TrackMatcher.ValidSpotifyId(c.SpotifyId) || Guid.TryParse(c.Mbid, out _) || c.Provider == "Apple iTunes" && long.TryParse(c.CatalogueId, out var id) && id > 0))
                    .OrderByDescending(c => TrackMatcher.Score(search with { Duration = native.Duration }, c).Confidence).Take(10).Select(c => c with { SourcePopularity = popularity.GetValueOrDefault(provider.Name, 50) }).ToArray();
                return (Candidates: candidates, Query: query, Error: "");
            }
            catch (OperationCanceledException) when (cancellation.IsCancellationRequested) { throw; }
            catch (Exception ex) when (ex is HttpRequestException or JsonException or ProviderException or OperationCanceledException or InvalidOperationException)
            { return (Candidates: Array.Empty<TrackCandidate>(), Query: query, Error: provider.Name + ": " + (ex is ProviderException ? ex.Message : ex is OperationCanceledException ? "Search timed out." : "Search unavailable.")); }
        }).ToArray();
        var results = await Task.WhenAll(tasks); cancellation.ThrowIfCancellationRequested();
        var all = results.SelectMany(r => r.Candidates).DistinctBy(c => c.Provider + ":" + (c.SpotifyId.Length > 0 ? c.SpotifyId : c.Mbid.Length > 0 ? c.Mbid : c.CatalogueId)).ToArray();
        var queries = results.Where(r => r.Query.Length > 0).Select(r => r.Query).ToArray();
        var errors = results.Where(r => r.Error.Length > 0).Select(r => r.Error).ToArray();
        return Result(all, queries, errors.Length > 0 ? string.Join(" ", errors) : queries.Length == 0 ? "Enable a provider in Music Finder to search." : "");
    }

    public void Dispose() { http.Dispose(); gate.Dispose(); }
}

public sealed record MusicSearchResult(string TrackKey, TrackCandidate[] Candidates, string[] Queries, string Detail)
{
    public Dictionary<string, double> SourcePopularity { get; init; } = [];
}
