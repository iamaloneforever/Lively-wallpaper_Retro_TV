using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
namespace RetroWave.Companion.Music;

public sealed record TrackCandidate(string Title, string Artist, string Album, double Duration, string Provider, string SpotifyId = "", string Mbid = "", string Isrc = "", string Disambiguation = "", string CatalogueId = "", double SourcePopularity = 50)
{
    public string[] Genres { get; init; } = [];
}
public sealed record CandidateScore(TrackCandidate Candidate, double Confidence, bool Accepted, string Reason);
public sealed record ProviderActivity(string Name, string Status, string ErrorCategory, DateTimeOffset? LastRequest = null, DateTimeOffset? LastSuccessfulMatch = null);
public sealed record ResolutionResult(string Status, TrackCandidate? Match, double Confidence, CandidateScore[] Candidates, string Error = "")
{
    public string[] Genres { get; init; } = [];
    public string GenreSource { get; init; } = "";
    public string GenreStatus { get; init; } = "";
    public ProviderActivity[] Providers { get; init; } = [];
    public bool FromCache { get; init; }
    public int CacheEntries { get; init; }
}

public static class MetadataNormalizer
{
    public static string CleanTitle(string title, string artist)
    {
        var parts = Regex.Split(title, @"\s+[-–—]\s+");
        if (parts.Length == 2 && Similarity(parts[0], artist) >= .8) title = parts[1];
        title = Regex.Replace(title, @"\s+(?:feat\.?|ft\.?|featuring)\s+.*$", "", RegexOptions.IgnoreCase);
        return Regex.Replace(title, @"\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring)\s+[^\)\]]+[\)\]]", "", RegexOptions.IgnoreCase);
    }
    public static double ArtistSimilarity(string left, string right)
    {
        static string[] Parts(string value) => Regex.Split(value, @"\s+(?:feat\.?|ft\.?|featuring|with|&|x)\s+|[,;/]", RegexOptions.IgnoreCase).Where(s => !string.IsNullOrWhiteSpace(s)).ToArray();
        return Math.Max(Similarity(left, right), Parts(left).SelectMany(a => Parts(right).Select(b => Similarity(a, b))).DefaultIfEmpty(0).Max());
    }
    public static string Normalize(string text)
    {
        text = Regex.Replace(text, @"\b(official\s+(music\s+)?video|official\s+audio|lyrics?\s+video|hd|hq|4k)\b", " ", RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"\b(feat\.?|ft\.?|featuring)\b", " ", RegexOptions.IgnoreCase);
        var normalized = new StringBuilder();
        foreach (var c in text.Normalize(NormalizationForm.FormKD).ToLowerInvariant())
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) normalized.Append(char.IsLetterOrDigit(c) ? c : ' ');
        return Regex.Replace(normalized.ToString(), @"\s+", " ").Trim();
    }
    public static string Version(string text) => string.Join(" ", Regex.Matches(Normalize(text), @"\b(live|acoustic|remix|mix|cover|demo|karaoke|extended|instrumental|slowed|sped|remaster(?:ed)?)\b").Select(m => m.Value.Replace("remastered", "remaster")).Distinct().Order());
    public static double Similarity(string left, string right)
    {
        left = Normalize(left); right = Normalize(right);
        if (left.Length == 0 || right.Length == 0) return 0;
        if (left == right) return 1;
        var a = left.Split(' ').ToHashSet(); var b = right.Split(' ').ToHashSet();
        var overlap = (double)a.Intersect(b).Count() / Math.Max(a.Count, b.Count);
        var previous = Enumerable.Range(0, right.Length + 1).ToArray();
        foreach (var c in left)
        {
            var next = new int[right.Length + 1]; next[0] = previous[0] + 1;
            for (var j = 1; j <= right.Length; j++) next[j] = Math.Min(Math.Min(next[j - 1] + 1, previous[j] + 1), previous[j - 1] + (c == right[j - 1] ? 0 : 1));
            previous = next;
        }
        return Math.Max(overlap, 1 - (double)previous[^1] / Math.Max(left.Length, right.Length));
    }
}
public static class TrackMatcher
{
    public static bool ValidSpotifyId(string value) => Regex.IsMatch(value, "^[A-Za-z0-9]{22}$");
    public static CandidateScore Score(PlaybackSnapshot track, TrackCandidate candidate)
    {
        if (track.Title.Length > 512 || track.Artist.Length > 512 || candidate.Title.Length > 512 || candidate.Artist.Length > 512 || candidate.Disambiguation.Length > 512) return new(candidate, 0, false, "Metadata exceeds matching limits");
        var title = MetadataNormalizer.Similarity(MetadataNormalizer.CleanTitle(track.Title, track.Artist), MetadataNormalizer.CleanTitle(candidate.Title, candidate.Artist));
        var artist = MetadataNormalizer.ArtistSimilarity(track.Artist, candidate.Artist);
        var knownDuration = track.Duration > 0 && candidate.Duration > 0;
        var delta = Math.Abs(track.Duration - candidate.Duration);
        var duration = knownDuration ? Math.Max(0, 1 - delta / 16) : 0;
        // Missing duration is not invented; redistribute weights over the observed fields.
        var score = knownDuration ? 55 * title + 30 * artist + 15 * duration : (55 * title + 30 * artist) / .85;
        if (track.Isrc.Length > 0 && track.Isrc == candidate.Isrc) score = Math.Min(100, score + 8);
        if (track.Mbid.Length > 0 && track.Mbid == candidate.Mbid) score = Math.Min(100, score + 8);
        var reason = title < .78 ? "Title differs" : artist < .55 ? "Artist differs" : knownDuration && delta > 8 ? "Duration differs by more than 8 seconds" : MetadataNormalizer.Version(track.Title) != MetadataNormalizer.Version(candidate.Title + " " + candidate.Disambiguation) ? "Recording version differs" : score < 82 ? "Confidence below 82" : "Accepted";
        if (!string.IsNullOrEmpty(track.Isrc) && !string.IsNullOrEmpty(candidate.Isrc) && track.Isrc != candidate.Isrc) reason = "ISRC differs";
        if (!string.IsNullOrEmpty(track.Mbid) && !string.IsNullOrEmpty(candidate.Mbid) && track.Mbid != candidate.Mbid) reason = "Recording MBID differs";
        return new(candidate, Math.Round(score, 2), reason == "Accepted", reason);
    }
    public static ResolutionResult Match(PlaybackSnapshot track, IEnumerable<TrackCandidate> candidates)
    {
        var scored = candidates.Take(100).Select(c => Score(track, c)).OrderByDescending(c => c.Confidence).ToArray();
        var accepted = scored.Where(c => c.Accepted).ToArray();
        if (accepted.Length == 0) return new("No match", null, 0, scored);
        if (accepted.Length > 1 && accepted[0].Confidence - accepted[1].Confidence < 4) return new("Match ambiguous", null, accepted[0].Confidence, scored);
        return new("Match found", accepted[0].Candidate, accepted[0].Confidence, scored);
    }
}
