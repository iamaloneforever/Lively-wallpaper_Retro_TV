using System.Text.Json;
namespace RetroWave.Companion;
internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
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
            ShowDebugger(); return 0;
        }
        catch (Exception ex)
        {
            DiagnosticLog.Error("companion", ex);
            if (!args.Contains("--run")) ShowError(ex.Message);
            return 1;
        }
    }
    [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
    private static void ShowDebugger() { ApplicationConfiguration.Initialize(); Application.Run(new DebuggerForm()); }
    [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
    private static void ShowError(string message) { ApplicationConfiguration.Initialize(); MessageBox.Show(message, "RetroWave TV companion"); }
}
internal static class WorkerHost
{
    public static void Run()
    {
        var state = new WallpaperInstaller(CompanionRuntime.Root, "").ReadState()
            ?? throw new InvalidOperationException("Install RetroWave TV before starting the companion.");
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
                var server = new LoopbackServer(state.BridgeToken).RunAsync(monitor.Read, cancellation.Token);
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
