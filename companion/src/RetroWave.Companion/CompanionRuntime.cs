using System.Security.Principal;
namespace RetroWave.Companion;
// Shared per-user lifecycle contract; the worker has no installer entry points.
public static class CompanionRuntime
{
    public static readonly string Root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "RetroWave TV");
    public static string Executable => Path.Combine(Root, "RetroWave.Companion.exe");
    private static string UserId => WindowsIdentity.GetCurrent().User!.Value;
    public static string MutexName => @"Local\RetroWaveTV-" + UserId;
    public static string StopName => @"Local\RetroWaveTV-Stop-" + UserId;
    public static void Stop()
    {
        if (EventWaitHandle.TryOpenExisting(StopName, out var stop)) { using (stop) stop.Set(); }
        using var mutex = new Mutex(false, MutexName);
        var acquired = false;
        try
        {
            try { acquired = mutex.WaitOne(TimeSpan.FromSeconds(10)); } catch (AbandonedMutexException) { acquired = true; }
            if (!acquired) throw new IOException("The companion is still stopping. Try again shortly.");
        }
        finally { if (acquired) mutex.ReleaseMutex(); }
    }
}
