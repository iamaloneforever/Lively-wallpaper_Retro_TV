using Windows.Media.Control;
using Windows.Storage.Streams;

namespace RetroWave.Companion;

public sealed class MediaMonitor : IDisposable
{
    private GlobalSystemMediaTransportControlsSessionManager? manager;
    private GlobalSystemMediaTransportControlsSession? session;
    private PlaybackSnapshot snapshot = new();
    private PlaybackSnapshot metadata = new();
    private int dirty = 1;
    private long sequence;
    private DateTimeOffset lastMetadata;
    private readonly TrackResolver resolver = new();
    private CancellationTokenSource? lookup;
    private string lookupIdentity = "";
    private string trackId = "";
    private DateTimeOffset nextLookup;
    private int revision;
    private readonly bool catalog;
    private readonly object lookupLock = new();
    public MediaMonitor(bool catalog) => this.catalog = catalog;
    public PlaybackSnapshot Read()
    {
        var value = Volatile.Read(ref snapshot);
        return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - value.CapturedAtUnixMs > 3500 ? new() { Status = "media_unavailable" } : value;
    }
    private void MediaChanged(GlobalSystemMediaTransportControlsSession sender, MediaPropertiesChangedEventArgs args)
    {
        Interlocked.Exchange(ref dirty, 1);
        Interlocked.Increment(ref revision);
        Volatile.Write(ref snapshot, new() { Status = "track_changed", CapturedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
    }
    public async Task RunAsync(CancellationToken cancellation)
    {
        while (!cancellation.IsCancellationRequested)
        {
            try
            {
                manager ??= await GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(5), cancellation);
                var current = manager.GetCurrentSession();
                var selected = SessionSelection.Select(current, manager.GetSessions(), s => s.GetPlaybackInfo().PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing);
                if (!Equals(selected, session))
                {
                    if (session is not null) session.MediaPropertiesChanged -= MediaChanged;
                    session = selected;
                    if (session is not null) session.MediaPropertiesChanged += MediaChanged;
                    Interlocked.Exchange(ref dirty, 1); CancelLookup(); metadata = new();
                }
                if (session is null) Publish(new() { Status = "no_session" });
                else
                {
                    var refresh = Interlocked.Exchange(ref dirty, 0) != 0;
                    if (refresh || DateTimeOffset.UtcNow - lastMetadata > TimeSpan.FromSeconds(5))
                    {
                        var version = Volatile.Read(ref revision);
                        var observed = session;
                        var properties = await observed.TryGetMediaPropertiesAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(5), cancellation);
                        var title = properties.Title ?? "";
                        var artist = string.IsNullOrWhiteSpace(properties.Artist) ? properties.AlbumArtist ?? "" : properties.Artist;
                        var next = new PlaybackSnapshot { Title = title, Artist = artist, Album = properties.AlbumTitle ?? "", AlbumArtist = properties.AlbumArtist ?? "", Player = observed.SourceAppUserModelId };
                        if (next.Identity != metadata.Identity) CancelLookup();
                        if (next.Identity != metadata.Identity || refresh)
                        {
                            string thumbnail = "";
                            try
                            {
                                if (properties.Thumbnail is not null)
                                {
                                    using var stream = await properties.Thumbnail.OpenReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(3), cancellation);
                                    if (stream.Size is > 0 and <= 2_000_000)
                                    {
                                        using var reader = new DataReader(stream.GetInputStreamAt(0));
                                        var loaded = await reader.LoadAsync((uint)stream.Size).AsTask().WaitAsync(TimeSpan.FromSeconds(3), cancellation);
                                        var bytes = new byte[loaded]; reader.ReadBytes(bytes); thumbnail = Convert.ToBase64String(bytes);
                                    }
                                }
                            }
                            catch (Exception ex) when (ex is not OperationCanceledException) { /* Artwork is optional. */ }
                            next = next with { Thumbnail = thumbnail };
                        }
                        else next = next with { Thumbnail = metadata.Thumbnail };
                        metadata = next; lastMetadata = DateTimeOffset.UtcNow;
                        // An event during the asynchronous metadata read invalidates its result.
                        if (dirty != 0 || version != Volatile.Read(ref revision)) { Publish(new() { Status = "track_changed" }); continue; }
                    }
                    var timeline = session.GetTimelineProperties(); var info = session.GetPlaybackInfo();
                    var now = DateTimeOffset.UtcNow; var playing = info.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing;
                    var duration = (timeline.EndTime - timeline.StartTime).TotalSeconds;
                    var rate = PlaybackSnapshot.ValidRate(info.PlaybackRate ?? 1);
                    var nextSnapshot = metadata with
                    {
                        Duration = Math.Max(0, duration), Rate = rate, IsPlaying = playing, PlaybackStatus = info.PlaybackStatus.ToString(),
                        Position = PlaybackSnapshot.TimelinePosition((timeline.Position - timeline.StartTime).TotalSeconds, duration, playing, rate, timeline.LastUpdatedTime, now),
                        Status = duration > 0 ? "ready" : "no_timeline"
                    };
                    lock (lookupLock) nextSnapshot = nextSnapshot with { TrackId = trackId };
                    if (dirty != 0) Publish(new() { Status = "track_changed" });
                    else { Publish(nextSnapshot); StartLookup(nextSnapshot, cancellation); }
                }
            }
            catch (OperationCanceledException) when (cancellation.IsCancellationRequested) { break; }
            catch (Exception ex) { DiagnosticLog.Error("media", ex); Publish(new() { Status = "media_unavailable" }); manager = null; }
            await Task.Delay(200, cancellation); // 5 Hz clocks; metadata and cover reads are cached.
        }
    }
    private void Publish(PlaybackSnapshot value)
    {
        if (Volatile.Read(ref snapshot).Status != value.Status) DiagnosticLog.Write("media_status " + value.Status);
        Volatile.Write(ref snapshot, value with { Sequence = Interlocked.Increment(ref sequence), CapturedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
    }
    private void CancelLookup()
    {
        lock (lookupLock) { lookup?.Cancel(); lookup?.Dispose(); lookup = null; lookupIdentity = ""; trackId = ""; nextLookup = default; }
    }
    private void StartLookup(PlaybackSnapshot value, CancellationToken cancellation)
    {
        if (!catalog || value.Duration <= 0 || string.IsNullOrWhiteSpace(value.Album)) return;
        lock (lookupLock)
        {
            var identity = value.Identity + Math.Round(value.Duration);
            if (lookupIdentity == identity && DateTimeOffset.UtcNow < nextLookup) return;
            lookup?.Cancel(); lookup?.Dispose(); lookup = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
            lookupIdentity = identity; nextLookup = DateTimeOffset.MaxValue; var token = lookup.Token;
            _ = ResolveAsync(value, identity, token);
        }
    }
    private async Task ResolveAsync(PlaybackSnapshot value, string identity, CancellationToken token)
    {
        try
        {
            var id = await resolver.ResolveAsync(value, token);
            lock (lookupLock) if (!token.IsCancellationRequested && lookupIdentity == identity) { trackId = id; nextLookup = DateTimeOffset.UtcNow.AddSeconds(id.Length > 0 ? 21600 : 300); }
        }
        catch (OperationCanceledException) { }
    }
    public void Dispose()
    {
        if (session is not null) session.MediaPropertiesChanged -= MediaChanged;
        CancelLookup(); // Resolver remains alive until in-flight cancellation completes at process exit.
    }
}
