using System.Text.Json;

namespace RetroWave.Companion;

public sealed record PlaybackSnapshot
{
    public string Status { get; init; } = "no_session";
    public string Title { get; init; } = "";
    public string Artist { get; init; } = "";
    public string Album { get; init; } = "";
    public string AlbumArtist { get; init; } = "";
    public string Thumbnail { get; init; } = "";
    public string ArtworkKey { get; init; } = "";
    public string TrackId { get; init; } = "";
    public string Player { get; init; } = "";
    public string PlaybackStatus { get; init; } = "Closed";
    public int TrackNumber { get; init; }
    public string[] Genres { get; init; } = [];
    public string GenreSource { get; init; } = "";
    public string GenreStatus { get; init; } = "";
    public string MetadataSource { get; init; } = "Windows GSMTC";
    public string SpotifyIdProvider { get; init; } = "";
    public string RecordingProvider { get; init; } = "";
    public string Isrc { get; init; } = "";
    public string Mbid { get; init; } = "";
    public double Confidence { get; init; }
    public string ResolutionStatus { get; init; } = "Waiting for native metadata";
    public Music.CandidateScore[] Candidates { get; init; } = [];
    public string LyricsProvider { get; init; } = "Wallpaper managed";
    public long MetadataUpdatedUnixMs { get; init; }
    public int SessionCount { get; init; }
    public string ProviderError { get; init; } = "";
    public bool LrcLibAllowed { get; init; }
    public Music.ProviderActivity[] Providers { get; init; } = [];
    public string TrackKey { get; init; } = "";
    public string LyricsStatus { get; init; } = "Not reported by wallpaper";
    public bool FromCache { get; init; }
    public int CacheEntries { get; init; }
    public double Position { get; init; }
    public double Duration { get; init; }
    public double Rate { get; init; } = 1;
    public bool IsPlaying { get; init; }
    public long Sequence { get; init; }
    public long CapturedAtUnixMs { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public string Identity => $"{Player}\n{Title}\n{Artist}\n{Album}";
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static double TimelinePosition(double position, double duration, bool playing, double rate, DateTimeOffset updated, DateTimeOffset now)
    {
        if (!double.IsFinite(position) || !double.IsFinite(duration) || duration <= 0) return 0;
        // Some players report an uninitialized native timestamp. Never extrapolate from 1601.
        var elapsed = updated.Year >= 2000 ? Math.Max(0, (now - updated).TotalSeconds) : 0;
        return Math.Clamp(position + (playing ? elapsed * ValidRate(rate) : 0), 0, duration);
    }
    public static double ValidRate(double rate) => double.IsFinite(rate) && rate > 0 && rate <= 4 ? rate : 1;
}
