using System.Security.Principal;
namespace RetroWave.Companion;
// Shared per-user lifecycle contract; the worker has no installer entry points.
public static class CompanionRuntime
{
    public static readonly string Root = Path.GetFullPath(Environment.GetEnvironmentVariable("RETROWAVE_DATA_ROOT") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "RetroWave"));
    public static readonly string LegacyRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "RetroWave TV");
    public static string InstallDirectory => AppSettings.Load().InstallDirectory;
    public static int BridgePort => int.TryParse(Environment.GetEnvironmentVariable("RETROWAVE_BRIDGE_PORT"), out var port) && port is >= 1024 and <= 65535 ? port : LoopbackServer.Port;
    public static string Executable => Path.Combine(InstallDirectory, "RetroWave.exe");
    private static string UserId => WindowsIdentity.GetCurrent().User!.Value;
    private static string Scope => UserId + (Environment.GetEnvironmentVariable("RETROWAVE_DATA_ROOT") is null ? "" : "-" + Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(Root)))[..12]);
    public static string MutexName => @"Local\RetroWaveTV-" + Scope;
    public static string StopName => @"Local\RetroWaveTV-Stop-" + Scope;
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
