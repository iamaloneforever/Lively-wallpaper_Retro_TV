using System.Diagnostics;
using System.Net.Http;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using RetroWave.Companion.Music;
using RetroWave.Setup;
using Button = System.Windows.Controls.Button;
using CheckBox = System.Windows.Controls.CheckBox;
using TextBox = System.Windows.Controls.TextBox;
using Clipboard = System.Windows.Clipboard;
using MessageBox = System.Windows.MessageBox;
using ProgressBar = System.Windows.Controls.ProgressBar;
using ListBoxItem = System.Windows.Controls.ListBoxItem;
using ComboBox = System.Windows.Controls.ComboBox;
using Orientation = System.Windows.Controls.Orientation;
using HorizontalAlignment = System.Windows.HorizontalAlignment;
using SystemColors = System.Windows.SystemColors;
namespace RetroWave.Companion;

public partial class MainWindow : Window
{
    private readonly DispatcherTimer timer = new() { Interval = TimeSpan.FromMilliseconds(250) };
    private readonly HttpClient http = new() { Timeout = TimeSpan.FromSeconds(2) };
    private readonly CancellationTokenSource closing = new();
    private PlaybackSnapshot snapshot = new();
    private bool refreshing;
    private string page = "Dashboard";
    private string identity = "";
    private string artworkKey = "";
    private string artwork = "";
    private ProgressBar? progress;
    private TextBlock? timing;
    private DateTimeOffset lastPoll;
    private DateTimeOffset lastHealth;
    private DiagnosticReport? report;
    public MainWindow()
    {
        InitializeComponent(); ApplyTheme(); Render(); SourceInitialized += (_, _) => WindowBackdrop.Apply(this);
        Microsoft.Win32.SystemEvents.UserPreferenceChanged += PreferenceChanged;
        timer.Tick += async (_, _) => await RefreshAsync(); timer.Start();
        StateChanged += (_, _) => { if (WindowState == WindowState.Minimized) timer.Stop(); else timer.Start(); };
        Closed += (_, _) => { Microsoft.Win32.SystemEvents.UserPreferenceChanged -= PreferenceChanged; timer.Stop(); closing.Cancel(); http.Dispose(); }; // Worker owns its own process.
    }
    private void PreferenceChanged(object sender, Microsoft.Win32.UserPreferenceChangedEventArgs e)
        => Dispatcher.BeginInvoke(() => { if (!closing.IsCancellationRequested) { ApplyTheme(); WindowBackdrop.Apply(this); } });
    private void Navigate(object sender, SelectionChangedEventArgs e)
    {
        if (PageContent is null) return;
        page = (Navigation.SelectedItem as ListBoxItem)?.Tag?.ToString() ?? "Dashboard"; identity = ""; Render();
    }
    private void ApplyTheme()
    {
#pragma warning disable WPF0001 // Native Fluent ThemeMode is evaluation-tagged in .NET 10; isolated here.
        ThemeMode = AppSettings.Load().Theme switch { "Light" => System.Windows.ThemeMode.Light, "Dark" => System.Windows.ThemeMode.Dark, _ => System.Windows.ThemeMode.System };
#pragma warning restore WPF0001
        using var personalize = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
        var selected = AppSettings.Load().Theme;
        var dark = selected == "Dark" || (selected == "System" && personalize?.GetValue("AppsUseLightTheme") is int light && light == 0);
        System.Windows.Media.Brush Brush(string hex) => new System.Windows.Media.SolidColorBrush((System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(hex));
        Background = SystemParameters.HighContrast ? SystemColors.WindowBrush : Brush(dark ? "#111D2A" : "#F3F6FA");
        Foreground = SystemParameters.HighContrast ? SystemColors.WindowTextBrush : Brush(dark ? "#EDF4FA" : "#182B3D");
        Resources["AppText"] = Foreground;
        Resources["ControlBackground"] = SystemParameters.HighContrast ? SystemColors.ControlBrush : Brush(dark ? "#263C50" : "#EAF1F7");
        Resources["CardBackground"] = SystemParameters.HighContrast ? SystemColors.WindowBrush : Brush(dark ? "#1B2B3C" : "#FFFFFF");
        Resources["CardBorder"] = SystemParameters.HighContrast ? SystemColors.WindowTextBrush : Brush(dark ? "#314559" : "#DFE7EF");
    }
    private static TextBlock Text(string value, double size = 14) => new() { Text = value, FontSize = size, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 4, 0, 8) };
    private StackPanel Card(string heading)
    {
        var panel = new StackPanel(); panel.Children.Add(Text(heading, 18));
        PageContent.Children.Add(new Border { Style = (Style)FindResource("Card"), Child = panel }); return panel;
    }
    private static void Action(StackPanel panel, string label, Action action)
    {
        var button = new Button { Content = label, HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 5, 0, 5), Padding = new Thickness(14, 7, 14, 7) };
        button.Click += (_, _) => { try { action(); } catch (Exception) { MessageBox.Show("The action could not finish. Check Diagnostics or run setup to repair the installation.", "RetroWave"); } }; panel.Children.Add(button);
    }
    private void AsyncAction(StackPanel panel, string label, Func<Task> action)
    {
        var button = new Button { Content = label, HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 5, 0, 5), Padding = new Thickness(14, 7, 14, 7) };
        button.Click += async (_, _) => { button.IsEnabled = false; try { await action(); } catch (Exception ex) { MessageBox.Show(ex is ProviderException ? ex.Message : "Action unavailable. Check configuration and try again.", "RetroWave"); } finally { button.IsEnabled = true; } }; panel.Children.Add(button);
    }
    private void Field(StackPanel panel, string name, string value, string source)
    {
        var row = new Grid { Margin = new Thickness(0, 5, 0, 5) }; row.ColumnDefinitions.Add(new() { Width = new GridLength(145) }); row.ColumnDefinitions.Add(new()); row.ColumnDefinitions.Add(new() { Width = GridLength.Auto });
        var label = Text(name); row.Children.Add(label);
        var content = new StackPanel(); content.Children.Add(Text(string.IsNullOrEmpty(value) ? "Not provided" : value)); content.Children.Add(new TextBlock { Text = source, Opacity = .65, FontSize = 12, TextWrapping = TextWrapping.Wrap }); Grid.SetColumn(content, 1); row.Children.Add(content);
        var copy = new Button { Content = "Copy", Padding = new Thickness(8, 4, 8, 4), Margin = new Thickness(8), IsEnabled = value.Length > 0, VerticalAlignment = VerticalAlignment.Top }; copy.Click += (_, _) => Clipboard.SetText(value); Grid.SetColumn(copy, 2); row.Children.Add(copy); panel.Children.Add(row);
    }
    private void Render()
    {
        PageTitle.Text = page; PageContent.Children.Clear(); progress = null; timing = null;
        switch (page)
        {
            case "Dashboard":
                var overview = Card("Your music, connected"); overview.Children.Add(Text(snapshot.Title.Length > 0 ? snapshot.Title : "Waiting for a Windows media session", 26)); overview.Children.Add(Text(snapshot.Artist)); overview.Children.Add(Text(snapshot.Player.Length > 0 ? snapshot.Player : "Open a player that publishes Windows media controls.")); overview.Children.Add(Text(snapshot.ResolutionStatus)); WorkerActions(Card("Playback companion")); break;
            case "Now Playing":
                var song = Card("Native playback");
                if (snapshot.Thumbnail.Length > 0)
                {
                    try { using var stream = new MemoryStream(Convert.FromBase64String(snapshot.Thumbnail)); var image = new BitmapImage(); image.BeginInit(); image.CacheOption = BitmapCacheOption.OnLoad; image.StreamSource = stream; image.EndInit(); image.Freeze(); song.Children.Add(new System.Windows.Controls.Image { Source = image, Height = 190, HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 0, 0, 16) }); } catch (Exception) { song.Children.Add(Text("Artwork unavailable")); }
                }
                else song.Children.Add(Text("No artwork supplied", 16));
                song.Children.Add(Text(snapshot.Title.Length > 0 ? snapshot.Title : "Nothing playing", 26)); song.Children.Add(Text(snapshot.Artist, 18));
                progress = new ProgressBar { Minimum = 0, Maximum = Math.Max(1, snapshot.Duration), Height = 6, Margin = new Thickness(0, 14, 0, 8) }; song.Children.Add(progress); timing = Text(""); song.Children.Add(timing);
                Field(song, "Lyrics state", snapshot.LyricsStatus, "Authenticated wallpaper receipt");
                var fields = Card("Metadata & provenance"); var source = "Windows GSMTC / " + snapshot.Player;
                Field(fields, "Title", snapshot.Title, source); Field(fields, "Artist", snapshot.Artist, source); Field(fields, "Album artist", snapshot.AlbumArtist, source); Field(fields, "Album", snapshot.Album, source); Field(fields, "Track number", snapshot.TrackNumber > 0 ? snapshot.TrackNumber.ToString() : "", source); Field(fields, "Genres", string.Join(", ", snapshot.Genres), source);
                Field(fields, "Playback", snapshot.PlaybackStatus + " · " + snapshot.Rate.ToString("0.##") + "×", "Windows GSMTC"); Field(fields, "Spotify ID", snapshot.TrackId, snapshot.SpotifyIdProvider); Field(fields, "Recording MBID", snapshot.Mbid, snapshot.RecordingProvider); Field(fields, "ISRC", snapshot.Isrc, snapshot.RecordingProvider); Field(fields, "Confidence", snapshot.Confidence > 0 ? snapshot.Confidence.ToString("0.0") + "/100" : "", "RetroWave weighted matcher"); Field(fields, "Lyrics", snapshot.LyricsProvider, "Lyrics are retrieved by the wallpaper; receipt is not inferred from a Spotify ID."); Field(fields, "Metadata update", snapshot.MetadataUpdatedUnixMs > 0 ? DateTimeOffset.FromUnixTimeMilliseconds(snapshot.MetadataUpdatedUnixMs).ToLocalTime().ToString("G") : "", "Windows GSMTC"); break;
            case "Music Finder": RenderProviders(); break;
            case "Settings": RenderSettings(); break;
            case "Diagnostics":
                var health = Card("Application health"); health.Children.Add(Text(report is null ? "Checking…" : $"Bridge: {report.Bridge}\nNative media API: {report.Native}\nSessions: {report.Sessions}\nClock sequence: {report.Sequence}\nSnapshot age: {report.SnapshotAgeMs} ms\nInstallation: {CompanionRuntime.InstallDirectory}\nVersion: 4.0.0")); health.Children.Add(Text("Resolution: " + snapshot.ResolutionStatus + "\n" + snapshot.ProviderError));
                WorkerActions(health);
                health.Children.Add(Text($"Cache: {snapshot.CacheEntries}/256 entries · {(snapshot.FromCache ? "cached result" : "fresh result")}\nLively delivery: confirm in the wallpaper; bridge connectivity alone does not verify the hosted page."));
                Action(health, "Copy sanitized summary", () => Clipboard.SetText(report?.Serialize() ?? "No health report yet"));
                Action(health, "Save sanitized report", () => { var dialog = new Microsoft.Win32.SaveFileDialog { Filter = "JSON report|*.json", FileName = "RetroWave-diagnostics.json" }; if (dialog.ShowDialog(this) == true) report?.Save(dialog.FileName); });
                Action(health, "Open sanitized log", () => { if (File.Exists(DiagnosticLog.LogPath)) Process.Start(new ProcessStartInfo("notepad.exe") { ArgumentList = { DiagnosticLog.LogPath }, UseShellExecute = false })?.Dispose(); }); break;
            case "About":
                var about = Card("RetroWave 4.0"); about.Children.Add(Text("Music Companion for Lively Wallpaper\nRetroWave TV contributors\nCopyright © 2026 · MIT license\nUnsigned build")); about.Children.Add(Text("Native Windows media observation. Optional public catalogue matching. No telemetry."));
                Action(about, "Project & license", () => Open("https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV")); Action(about, "Spicy Lyrics", () => Open("https://spicylyrics.org")); break;
        }
    }
    private void WorkerActions(StackPanel panel)
    {
        panel.Children.Add(Text("Closing this window keeps the worker running. Sign-in startup is opt-in."));
        AsyncAction(panel, "Start / restart companion", async () => { await Task.Run(CompanionRuntime.Stop); StartWorker(); });
        AsyncAction(panel, "Stop companion", () => Task.Run(CompanionRuntime.Stop));
        AsyncAction(panel, "Quit RetroWave completely", async () => { await Task.Run(CompanionRuntime.Stop); Close(); });
    }
    private static void StartWorker()
    {
        if (new WallpaperInstaller(CompanionRuntime.Root, "").ReadState()?.Companion != true) throw new InvalidOperationException("Run setup first");
        Process.Start(new ProcessStartInfo(CompanionRuntime.Executable) { ArgumentList = { "--run" }, UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden })?.Dispose();
    }
    private static void Open(string path) { Process.Start(new ProcessStartInfo(path) { UseShellExecute = true })?.Dispose(); }
    private void Toggle(StackPanel panel, string label, bool enabled, Action<bool> save)
    {
        var toggle = new CheckBox { Content = label, IsChecked = enabled, Margin = new Thickness(0, 8, 0, 8) }; toggle.Click += (_, _) => { try { save(toggle.IsChecked == true); } catch (Exception) { toggle.IsChecked = enabled; MessageBox.Show("The setting could not be saved.", "RetroWave"); } }; panel.Children.Add(toggle);
    }
    private void RenderSettings()
    {
        var settings = AppSettings.Load(); var general = Card("General");
        Toggle(general, "Start RetroWave when I sign in to Windows", settings.Startup, value => { AppSettings.SetStartup(value, CompanionRuntime.Executable); (AppSettings.Load() with { Startup = value }).Save(); });
        Field(general, "Installed location", settings.InstallDirectory, "Per-user installation record");
        Action(general, "Open installation folder", () => Open(CompanionRuntime.InstallDirectory)); Action(general, "Open application data", () => { Directory.CreateDirectory(CompanionRuntime.Root); Open(CompanionRuntime.Root); });
        Action(general, "Repair, relocate or uninstall…", () => { OpenSetup(); Close(); });
        var appearance = Card("Appearance"); var theme = new ComboBox { ItemsSource = new[] { "System", "Light", "Dark" }, SelectedItem = settings.Theme, Width = 180, HorizontalAlignment = HorizontalAlignment.Left }; theme.SelectionChanged += (_, _) => { (AppSettings.Load() with { Theme = theme.SelectedItem?.ToString() ?? "System" }).Save(); ApplyTheme(); }; appearance.Children.Add(theme);
        Toggle(appearance, "Reduce animation", settings.ReducedAnimation, value => (AppSettings.Load() with { ReducedAnimation = value }).Save());
        var privacy = Card("Privacy"); privacy.Children.Add(Text("Catalogue lookups share title, artist, album and duration with enabled services. Live metadata stays in memory. Reports omit music details, artwork and credentials. No telemetry is collected."));
        Toggle(privacy, "Allow external catalogue matching", settings.ExternalConsent, value => (AppSettings.Load() with { ExternalConsent = value }).Save());
        Toggle(privacy, "Allow LRCLIB fallback", settings.LrcLib, value => (AppSettings.Load() with { LrcLib = value }).Save());
        Toggle(privacy, "Consent to experimental Spotify lookup", settings.ExperimentalConsent, value => (AppSettings.Load() with { ExperimentalConsent = value }).Save());
        AsyncAction(privacy, "Clear in-memory matching cache", async () => { await Task.Run(CompanionRuntime.Stop); StartWorker(); });
        var advanced = Card("Advanced");
        AsyncAction(advanced, "Reset companion preferences (keeps installation)", async () =>
        {
            var current = AppSettings.Load(); await Task.Run(CompanionRuntime.Stop);
            AppSettings.SetStartup(false, CompanionRuntime.Executable); (new AppSettings { InstallDirectory = current.InstallDirectory }).Save();
            if (new WallpaperInstaller(CompanionRuntime.Root, "").ReadState()?.Companion == true) StartWorker(); ApplyTheme(); Render();
        });
    }
    private static void OpenSetup() => Process.Start(new ProcessStartInfo(CompanionRuntime.Executable) { ArgumentList = { "--setup" }, UseShellExecute = false })?.Dispose();
    private void RenderProviders()
    {
        var settings = AppSettings.Load();
        PageContent.Children.Add(Text("Search order is top to bottom. Catalogue matching requires external lookup consent in Settings. Tokens stay in Windows Credential Locker."));
        foreach (var preference in settings.Providers)
        {
            var card = Card(preference.Name); var name = preference.Name;
            var purpose = name switch { "MusicBrainz" => "Recording MBIDs and ISRC · public metadata", "Apple iTunes" => "Supplementary metadata verification · no Spotify IDs", "Experimental Spotify" => "Spotify IDs · unofficial and fragile · explicit consent required", "ACRCloud" => "Spotify IDs and ISRC · user-supplied bearer token", "Official Spotify" => "Spotify IDs · supported OAuth PKCE · developer access required", _ => "Public Spotify-ID resolver · no account required" };
            card.Children.Add(Text(purpose)); card.Children.Add(Text("Sends song metadata externally when enabled and consented."));
            var activity = snapshot.Providers.FirstOrDefault(p => p.Name == name);
            card.Children.Add(Text(activity is null ? "Last request: not requested" : $"Last request: {activity.Status} · {activity.LastRequest?.ToLocalTime():g}\nLast successful match: {activity.LastSuccessfulMatch?.ToLocalTime():g}\n{activity.ErrorCategory}"));
            var scores = snapshot.Candidates.Where(c => c.Candidate.Provider == name).ToArray(); card.Children.Add(Text(scores.Length == 0 ? "No results for the current track" : string.Join("\n", scores.Select(c => $"{c.Candidate.Title} — {c.Candidate.Artist} · {c.Confidence:0.0} · {c.Reason}"))));
            if (snapshot.ProviderError.Contains(name, StringComparison.Ordinal)) card.Children.Add(Text(snapshot.ProviderError.Split(';').FirstOrDefault(e => e.Contains(name, StringComparison.Ordinal)) ?? ""));
            Toggle(card, "Enabled", preference.Enabled, value => (AppSettings.Load() with { Providers = AppSettings.Load().Providers.Select(p => p.Name == name ? p with { Enabled = value } : p).ToArray() }).Save());
            Action(card, "Move earlier", () => { var current = AppSettings.Load(); var order = current.Providers.ToList(); var index = order.FindIndex(p => p.Name == name); if (index > 0) { (order[index - 1], order[index]) = (order[index], order[index - 1]); (current with { Providers = order.ToArray() }).Save(); Render(); } });
            if (name == "ACRCloud")
            {
                card.Children.Add(Text(CredentialStore.Get(name).Length > 0 ? "Credential configured" : "Credential not configured")); var secret = new PasswordBox { MaxWidth = 350, HorizontalAlignment = HorizontalAlignment.Left }; card.Children.Add(secret); Action(card, "Save bearer token", () => { CredentialStore.Set(name, secret.Password); secret.Clear(); Render(); }); Action(card, "Remove credential", () => { CredentialStore.Set(name, ""); Render(); });
            }
            if (name == "Official Spotify")
            {
                card.Children.Add(Text("Register this redirect in your Spotify developer app: " + SpotifyOAuth.Redirect)); var clientId = new TextBox { Text = CredentialStore.Get("Spotify client ID"), MaxWidth = 350, HorizontalAlignment = HorizontalAlignment.Left }; card.Children.Add(clientId); AsyncAction(card, "Authorize with Spotify…", async () => { await SpotifyOAuth.AuthorizeAsync(clientId.Text, closing.Token); Render(); });
                Action(card, "Disconnect Spotify", () => { CredentialStore.Set("Spotify refresh token", ""); Render(); });
            }
            AsyncAction(card, "Test current track", async () =>
            {
                var current = AppSettings.Load(); if (!current.ExternalConsent || (name == "Experimental Spotify" && !current.ExperimentalConsent)) throw new ProviderException("Enable the required consent in Settings first");
                if (snapshot.Title.Length == 0) throw new ProviderException("Play a track first");
                using var resolver = new TrackResolver(); var result = await resolver.ResolveDetailedAsync(snapshot, current with { Providers = [new(name, true)] }, closing.Token); MessageBox.Show(result.Status + "\n" + result.Error, "RetroWave provider test");
            });
        }
        var lyrics = Card("LRCLIB · lyrics fallback"); lyrics.Children.Add(Text("Synchronized or plain lyrics. Runs in the wallpaper independently of Spotify-ID resolution. Enable in Privacy or the wallpaper settings."));
    }
    private async Task RefreshAsync()
    {
        if (refreshing) return; refreshing = true;
        try
        {
            if (DateTimeOffset.UtcNow - lastPoll >= TimeSpan.FromSeconds(1))
            {
                lastPoll = DateTimeOffset.UtcNow;
                var state = new WallpaperInstaller(CompanionRuntime.Root, "").ReadState();
                if (state is not null)
                {
                    using var request = new HttpRequestMessage(HttpMethod.Get, $"http://127.0.0.1:{CompanionRuntime.BridgePort}/inspector"); request.Headers.Add("Origin", "https://iamaloneforever.github.io"); request.Headers.Add("X-RetroWave-Key", state.BridgeToken);
                    using var response = await http.SendAsync(request, closing.Token); response.EnsureSuccessStatusCode(); snapshot = JsonSerializer.Deserialize<PlaybackSnapshot>(await response.Content.ReadAsStringAsync(closing.Token), PlaybackSnapshot.Json) ?? new(); BridgeLabel.Text = "● Companion connected";
                    if (snapshot.ArtworkKey != artworkKey)
                    {
                        artwork = ""; artworkKey = snapshot.ArtworkKey;
                        if (artworkKey.Length > 0)
                        {
                            using var coverRequest = new HttpRequestMessage(HttpMethod.Get, $"http://127.0.0.1:{CompanionRuntime.BridgePort}/inspector?artwork=1"); coverRequest.Headers.Add("Origin", "https://iamaloneforever.github.io"); coverRequest.Headers.Add("X-RetroWave-Key", state.BridgeToken);
                            using var coverResponse = await http.SendAsync(coverRequest, closing.Token); coverResponse.EnsureSuccessStatusCode(); snapshot = JsonSerializer.Deserialize<PlaybackSnapshot>(await coverResponse.Content.ReadAsStringAsync(closing.Token), PlaybackSnapshot.Json) ?? new(); artwork = snapshot.Thumbnail; artworkKey = snapshot.ArtworkKey;
                        }
                    }
                    snapshot = snapshot with { Thumbnail = artwork };
                }
                else { snapshot = new(); BridgeLabel.Text = "Companion not installed"; }
                var nextIdentity = snapshot.Identity + snapshot.ResolutionStatus + snapshot.Confidence + snapshot.TrackId + snapshot.PlaybackStatus + snapshot.LyricsProvider + snapshot.LyricsStatus + snapshot.ArtworkKey;
                if (identity != nextIdentity) { identity = nextIdentity; if (page is "Dashboard" or "Now Playing" or "Music Finder") Render(); }
            }
            if (DateTimeOffset.UtcNow - lastHealth > TimeSpan.FromSeconds(5)) { lastHealth = DateTimeOffset.UtcNow; report = await DiagnosticReport.CaptureAsync(closing.Token); if (page == "Diagnostics") Render(); }
            if (progress is not null && timing is not null)
            {
                var captured = DateTimeOffset.FromUnixTimeMilliseconds(Math.Max(0, snapshot.CapturedAtUnixMs)); var position = PlaybackSnapshot.TimelinePosition(snapshot.Position, snapshot.Duration, snapshot.IsPlaying, snapshot.Rate, captured, DateTimeOffset.UtcNow);
                progress.Value = position; timing.Text = $"{TimeSpan.FromSeconds(position):m\\:ss} / {TimeSpan.FromSeconds(snapshot.Duration):m\\:ss} · {snapshot.PlaybackStatus}";
            }
        }
        catch (OperationCanceledException) when (closing.IsCancellationRequested) { }
        catch (Exception) { BridgeLabel.Text = "○ Companion disconnected"; snapshot = new(); if (page is "Dashboard" or "Now Playing") Render(); }
        finally { refreshing = false; }
    }
}
