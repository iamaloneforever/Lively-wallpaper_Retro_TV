using System.Text.Json;
namespace SpicyBond.Companion;
internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            if (args.Contains("--licenses"))
            {
                var directoryIndex = Array.IndexOf(args, "--licenses-dir");
                if (directoryIndex < 0) LicenseMaterials.Show();
                else if (directoryIndex + 1 >= args.Length) throw new ArgumentException("Provide a path after --licenses-dir.");
                else LicenseMaterials.Extract(args[directoryIndex + 1]);
                return 0;
            }
            if (args.Contains("--run")) { WorkerHost.Run(); return 0; }
            if (args.Contains("--stop")) { CompanionRuntime.Stop(); return 0; }
            if (args.Contains("--once"))
            {
                using var monitor = new MediaMonitor(false);
                using var cancellation = new CancellationTokenSource();
                var task = monitor.RunAsync(cancellation.Token);
                Task.Delay(1200).GetAwaiter().GetResult();
                Console.WriteLine(JsonSerializer.Serialize(monitor.Read(), PlaybackSnapshot.Json));
                cancellation.Cancel();
                try { task.GetAwaiter().GetResult(); } catch (OperationCanceledException) { }
                return 0;
            }
            if (args.Contains("--diagnose"))
            {
                DiagnosticReport.CaptureAsync().GetAwaiter().GetResult().Save(Path.Combine(CompanionRuntime.Root, "diagnostics.json"));
                return 0;
            }
            if (args.Contains("--setup") || args.Contains("--install") || args.Contains("--uninstall") || string.Equals(Path.GetFileName(Environment.ProcessPath), "SpicyBond-Setup.exe", StringComparison.OrdinalIgnoreCase))
            {
                if (args.Contains("--install"))
                {
                    var saved = AppSettings.Load(); var directoryIndex = Array.IndexOf(args, "--directory");
                    if (directoryIndex >= 0 && directoryIndex + 1 >= args.Length) throw new ArgumentException("Provide a path after --directory.");
                    bool? startup = args.Contains("--startup") ? true : args.Contains("--no-startup") ? false : null;
                    SpicyBond.Setup.WindowsSetup.Install(!args.Contains("--no-companion"), !args.Contains("--no-catalog") && (args.Contains("--catalog") || saved.ExternalConsent), startup, directoryIndex >= 0 ? args[directoryIndex + 1] : null); return 0;
                }
                if (args.Contains("--uninstall")) { SpicyBond.Setup.WindowsSetup.Uninstall(); return 0; }
                ShowSetup(); return 0;
            }
            ShowApplication(); return 0;
        }
        catch (Exception ex)
        {
            DiagnosticLog.Error("companion", ex);
            if (!args.Contains("--run") && !args.Contains("--quiet")) ShowError(ex.Message);
            return 1;
        }
    }
    [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
    private static void ShowApplication() { var app = new System.Windows.Application(); app.Run(new MainWindow()); }
    [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
    private static void ShowSetup() { var app = new System.Windows.Application(); app.Run(new SpicyBond.Setup.SetupWindow()); }
    [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
    private static void ShowError(string message) { System.Windows.MessageBox.Show(message, "Spicy Bond"); }
}
internal static class WorkerHost
{
    public static void Run()
    {
        var state = new WallpaperInstaller(CompanionRuntime.Root, "").ReadState()
            ?? throw new InvalidOperationException("Install Spicy Bond before starting the companion.");
        if (!state.Companion) return;
        using var mutex = new Mutex(false, CompanionRuntime.MutexName);
        try { if (!mutex.WaitOne(0)) return; } catch (AbandonedMutexException) { }
        try
        {
            using var stop = new EventWaitHandle(false, EventResetMode.ManualReset, CompanionRuntime.StopName);
            using var cancellation = new CancellationTokenSource();
            using var monitor = new MediaMonitor(state.Catalog);
            var registered = ThreadPool.RegisterWaitForSingleObject(stop, (_, _) => cancellation.Cancel(), null, Timeout.Infinite, true);
            DiagnosticLog.Write("worker_started");
            try
            {
                var media = monitor.RunAsync(cancellation.Token);
                var server = new LoopbackServer(state.BridgeToken, CompanionRuntime.BridgePort, NativeExportDialog.ChoosePathAsync).RunAsync(monitor.Read, cancellation.Token, monitor.ReportLyrics, async (native, title, artist, token) =>
                {
                    using var resolver = new TrackResolver();
                    return await resolver.SearchCandidatesAsync(native, title, artist, AppSettings.Load(), token);
                });
                Task.WhenAny(media, server).GetAwaiter().GetResult().GetAwaiter().GetResult();
                cancellation.Cancel();
                try { Task.WhenAll(media, server).GetAwaiter().GetResult(); } catch (OperationCanceledException) { }
            }
            catch (OperationCanceledException) when (cancellation.IsCancellationRequested) { }
            finally { cancellation.Cancel(); registered.Unregister(null); DiagnosticLog.Write("worker_stopped"); }
        }
        finally { mutex.ReleaseMutex(); }
    }
}
