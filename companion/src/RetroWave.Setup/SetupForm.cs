using RetroWave.Companion;
namespace RetroWave.Setup;
internal sealed class SetupForm : Form
{
    private readonly CheckBox lyrics = new() { Text = "Install the companion for synchronized lyrics", Checked = true, AutoSize = true };
    private readonly CheckBox catalog = new() { Text = "Allow public MetaBrainz matching for Spicy Lyrics", AutoSize = true };
    private readonly CheckBox startup = new() { Text = "Start RetroWave automatically when I sign in to Windows", AutoSize = true };
    private readonly CheckBox desktop = new() { Text = "Create desktop shortcut", AutoSize = true };
    private readonly CheckBox launch = new() { Text = "Launch RetroWave after installation", Checked = true, AutoSize = true };
    private readonly CheckBox lrclib = new() { Text = "Allow LRCLIB lyrics fallback (shares song metadata)", AutoSize = true };
    private readonly CheckBox experimental = new() { Text = "Consent to experimental Spotify lookup (unofficial)", AutoSize = true };
    private readonly TextBox destination = new() { Width = 390 };
    private readonly Label status = new() { AutoSize = true, MaximumSize = new System.Drawing.Size(480, 0) };
    public SetupForm()
    {
        Text = "RetroWave setup"; AutoScaleMode = AutoScaleMode.Dpi; FormBorderStyle = FormBorderStyle.FixedDialog;
        Font = new System.Drawing.Font("Segoe UI", 10); BackColor = System.Drawing.Color.FromArgb(244, 247, 249);
        Icon = System.Drawing.Icon.ExtractAssociatedIcon(Environment.ProcessPath!);
        MaximizeBox = false; StartPosition = FormStartPosition.CenterScreen; ClientSize = new(600, 660);
        var panel = new FlowLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(22), FlowDirection = FlowDirection.TopDown, WrapContents = false };
        panel.Controls.Add(new Label { Text = "RetroWave TV", AutoSize = true, Font = new System.Drawing.Font("Segoe UI", 20) });
        panel.Controls.Add(new Label { Text = "Keep the wallpaper on GitHub Pages. Setup configures Lively automatically.\nThe optional companion supplies the playback clock without a Spotify account.", AutoSize = true, MaximumSize = new(480, 0), Margin = new Padding(3, 10, 3, 15) });
        var preferences = AppSettings.Load(); destination.Text = preferences.InstallDirectory; startup.Checked = preferences.Startup; catalog.Checked = preferences.ExternalConsent; lrclib.Checked = preferences.LrcLib; experimental.Checked = preferences.ExperimentalConsent;
        panel.Controls.Add(new Label { Text = "Installation folder · per-user, no elevation", AutoSize = true });
        var folders = new FlowLayoutPanel { AutoSize = true }; var browse = new Button { Text = "Browse…", AutoSize = true };
        folders.Controls.Add(destination); folders.Controls.Add(browse); panel.Controls.Add(folders);
        browse.Click += (_, _) => { using var picker = new FolderBrowserDialog { InitialDirectory = destination.Text }; if (picker.ShowDialog(this) == DialogResult.OK) destination.Text = picker.SelectedPath; };
        panel.Controls.Add(lyrics); panel.Controls.Add(startup); panel.Controls.Add(catalog); panel.Controls.Add(lrclib); panel.Controls.Add(experimental); panel.Controls.Add(desktop); panel.Controls.Add(launch);
        panel.Controls.Add(new Label { Text = "MetaBrainz receives song title, artist and album. It is optional and off by default.\nYou can use LRCLIB instead by enabling it in the wallpaper's settings.", AutoSize = true, MaximumSize = new(480, 0), Margin = new Padding(3, 3, 3, 12) });
        var buttons = new FlowLayoutPanel { AutoSize = true };
        var install = new Button { Text = "Install / repair", AutoSize = true }; var uninstall = new Button { Text = "Uninstall", AutoSize = true };
        var debug = new Button { Text = "Open RetroWave", AutoSize = true };
        buttons.Controls.Add(install); buttons.Controls.Add(uninstall); buttons.Controls.Add(debug); panel.Controls.Add(buttons); panel.Controls.Add(status); Controls.Add(panel);
        debug.Click += (_, _) =>
        {
            if (!File.Exists(WindowsSetup.Executable)) { status.Text = "Install RetroWave first."; return; }
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(WindowsSetup.Executable) { UseShellExecute = true })?.Dispose();
        };
        lyrics.CheckedChanged += (_, _) => { catalog.Enabled = lyrics.Checked; if (!lyrics.Checked) catalog.Checked = false; };
        async Task Execute(Func<string> action)
        {
            install.Enabled = uninstall.Enabled = debug.Enabled = false; lyrics.Enabled = catalog.Enabled = false;
            status.Text = "Working…";
            try { status.Text = await Task.Run(action); }
            catch (Exception ex) { status.Text = ex.Message; }
            finally { install.Enabled = uninstall.Enabled = lyrics.Enabled = debug.Enabled = true; catalog.Enabled = lyrics.Checked; }
        }
        install.Click += async (_, _) =>
        {
            var withLyrics = lyrics.Checked; var withCatalog = catalog.Checked; var withStartup = startup.Checked; var path = destination.Text; var withDesktop = desktop.Checked; var withLaunch = launch.Checked; var withLrc = lrclib.Checked; var withExperimental = experimental.Checked;
            await Execute(() => { var message = WindowsSetup.Install(withLyrics, withCatalog, withStartup, path, withDesktop, withLaunch); var saved = AppSettings.Load(); (saved with { LrcLib = withLrc, ExperimentalConsent = withExperimental, Providers = saved.Providers.Select(p => p.Name == "Experimental Spotify" ? p with { Enabled = withExperimental } : p).ToArray() }).Save(); return message; });
        };
        uninstall.Click += async (_, _) => await Execute(WindowsSetup.Uninstall);
    }
}
