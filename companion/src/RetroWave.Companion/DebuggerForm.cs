using System.Diagnostics;
namespace RetroWave.Companion;
internal sealed class DebuggerForm : Form
{
    private readonly TextBox display = new() { Dock = DockStyle.Fill, Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical, Font = new System.Drawing.Font("Consolas", 11) };
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 2000 };
    private readonly CancellationTokenSource closing = new();
    private readonly Button restart = new() { Text = "Start / restart", AutoSize = true };
    private readonly Button stop = new() { Text = "Stop companion", AutoSize = true };
    private readonly Button export = new() { Text = "Save report", AutoSize = true };
    private DiagnosticReport? report;
    private bool refreshing;
    public DebuggerForm()
    {
        Text = "RetroWave TV - Companion debugger"; AutoScaleMode = AutoScaleMode.Dpi; ClientSize = new(760, 510); MinimumSize = new(600, 420);
        var buttons = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(10) };
        var log = new Button { Text = "Open log", AutoSize = true };
        buttons.Controls.AddRange([restart, stop, export, log]); Controls.Add(display); Controls.Add(buttons);
        restart.Click += async (_, _) => await ExecuteAsync(() =>
        {
            var state = new WallpaperInstaller(CompanionRuntime.Root, "").ReadState();
            if (state?.Companion != true) throw new InvalidOperationException("Run setup and enable the playback companion first.");
            CompanionRuntime.Stop();
            Process.Start(new ProcessStartInfo(CompanionRuntime.Executable) { Arguments = "--run", UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden })?.Dispose();
        });
        stop.Click += async (_, _) => await ExecuteAsync(CompanionRuntime.Stop);
        log.Click += (_, _) => { if (File.Exists(DiagnosticLog.LogPath)) Process.Start(new ProcessStartInfo("notepad.exe") { ArgumentList = { DiagnosticLog.LogPath }, UseShellExecute = false })?.Dispose(); };
        export.Click += (_, _) =>
        {
            if (report is null) return;
            using var dialog = new SaveFileDialog { Filter = "Diagnostic report (*.json)|*.json", FileName = "RetroWave-diagnostics.json" };
            if (dialog.ShowDialog(this) == DialogResult.OK)
                try { report.Save(dialog.FileName); } catch (Exception ex) { MessageBox.Show(this, ex.Message); }
        };
        timer.Tick += async (_, _) => await RefreshAsync();
        Shown += async (_, _) => { timer.Start(); await RefreshAsync(); };
        FormClosed += (_, _) => { timer.Dispose(); closing.Cancel(); };
    }
    private async Task ExecuteAsync(Action action)
    {
        restart.Enabled = stop.Enabled = false;
        try { await Task.Run(action); await RefreshAsync(); }
        catch (Exception ex) { DiagnosticLog.Error("debugger_action", ex); if (!IsDisposed) MessageBox.Show(this, ex.Message, Text); }
        finally { if (!IsDisposed) restart.Enabled = stop.Enabled = true; }
    }
    private async Task RefreshAsync()
    {
        if (refreshing || IsDisposed) return;
        refreshing = true;
        try
        {
            report = await DiagnosticReport.CaptureAsync(closing.Token);
            if (IsDisposed) return;
            display.Text = $"Installation: {(report.Installed ? "installed" : "missing")}\r\nBridge: {report.Bridge}\r\nNative media API: {report.Native}\r\nDetected player sessions: {report.Sessions}\r\nMedia state: {report.Media}\r\nPosition: {report.Position:F2} / {report.Duration:F2} seconds\r\nPlayback rate: {report.Rate:F2}\r\nSequence: {report.Sequence}\r\nSnapshot age: {report.SnapshotAgeMs} ms\r\n\r\nA healthy clock has an increasing sequence and age below 3500 ms.\r\nNo sessions: open a player that exposes Windows media controls.\r\nNo timeline: the player has not supplied a usable song clock.\r\nConnected here but no wallpaper lyrics: check lyric provider, matching\r\nweb deployment and Lively's local-network permission.\r\n\r\nReports and logs omit song names, artwork and pairing keys.";
        }
        catch (OperationCanceledException) when (closing.IsCancellationRequested) { }
        catch (Exception ex) { DiagnosticLog.Error("debugger", ex); if (!IsDisposed) display.Text = "Cannot read installation: " + ex.Message; }
        finally { refreshing = false; }
    }
}
