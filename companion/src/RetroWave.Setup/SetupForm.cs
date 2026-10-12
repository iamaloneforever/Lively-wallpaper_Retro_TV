using RetroWave.Companion;
namespace RetroWave.Setup;
internal sealed class SetupForm : Form
{
    private readonly CheckBox lyrics = new() { Text = "Install the companion for synchronized lyrics", Checked = true, AutoSize = true };
    private readonly CheckBox catalog = new() { Text = "Allow public MetaBrainz matching for Spicy Lyrics", AutoSize = true };
    private readonly Label status = new() { AutoSize = true, MaximumSize = new System.Drawing.Size(480, 0) };
    public SetupForm()
    {
        Text = "RetroWave TV setup"; AutoScaleMode = AutoScaleMode.Dpi; ClientSize = new(530, 345); FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; StartPosition = FormStartPosition.CenterScreen; ClientSize = new(530, 420);
        var panel = new FlowLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(22), FlowDirection = FlowDirection.TopDown, WrapContents = false };
        panel.Controls.Add(new Label { Text = "RetroWave TV", AutoSize = true, Font = new System.Drawing.Font("Segoe UI", 20) });
        panel.Controls.Add(new Label { Text = "Keep the wallpaper on GitHub Pages. Setup configures Lively automatically.\nThe optional companion supplies the playback clock without a Spotify account.", AutoSize = true, MaximumSize = new(480, 0), Margin = new Padding(3, 10, 3, 15) });
        panel.Controls.Add(lyrics); panel.Controls.Add(catalog);
        panel.Controls.Add(new Label { Text = "MetaBrainz receives song title, artist and album. It is optional and off by default.\nYou can use LRCLIB instead by enabling it in the wallpaper's settings.", AutoSize = true, MaximumSize = new(480, 0), Margin = new Padding(3, 3, 3, 12) });
        var buttons = new FlowLayoutPanel { AutoSize = true };
        var install = new Button { Text = "Install / repair", AutoSize = true }; var uninstall = new Button { Text = "Uninstall", AutoSize = true };
        var debug = new Button { Text = "Open debugger", AutoSize = true };
        buttons.Controls.Add(install); buttons.Controls.Add(uninstall); buttons.Controls.Add(debug); panel.Controls.Add(buttons); panel.Controls.Add(status); Controls.Add(panel);
        debug.Click += (_, _) =>
        {
            if (!File.Exists(WindowsSetup.Executable)) { status.Text = "Install the companion first, then open its debugger."; return; }
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(WindowsSetup.Executable) { Arguments = "--debug", UseShellExecute = true })?.Dispose();
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
        install.Click += async (_, _) => { var withLyrics = lyrics.Checked; var withCatalog = catalog.Checked; await Execute(() => WindowsSetup.Install(withLyrics, withCatalog)); };
        uninstall.Click += async (_, _) => await Execute(WindowsSetup.Uninstall);
    }
}
