using System.Diagnostics;
using RetroWave.Companion;
using System.Text.Json.Nodes;
using Microsoft.Win32;
using Windows.Management.Deployment;

namespace RetroWave.Setup;

public sealed record LivelyInstallation(string Executable, string Library, string SettingsPath);
public static class WindowsSetup
{
    public static string Root => CompanionRuntime.Root;
    public static string Executable => CompanionRuntime.Executable;
    public static string SetupExecutable => Path.Combine(Root, "RetroWave-Setup.exe");
    public static string DebuggerShortcut => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "RetroWave TV Debugger.lnk");



    public static LivelyInstallation DetectLively()
    {
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var roots = new List<(string Exe, string Data)>();
        foreach (var package in new PackageManager().FindPackagesForUser(""))
        {
            if (package.Id.Name != "12030rocksdanister.LivelyWallpaper") continue;
            roots.Add((Path.Combine(package.InstalledLocation.Path, "Build", "Lively.exe"), Path.Combine(local, "Packages", package.Id.FamilyName, "LocalCache", "Local", "Lively Wallpaper")));
        }
        foreach (var directory in new[] { Path.Combine(local, "Programs", "Lively Wallpaper"), Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Lively Wallpaper"), Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Lively Wallpaper") })
            roots.Add((Path.Combine(directory, "Lively.exe"), Path.Combine(local, "Lively Wallpaper")));
        foreach (var (exe, data) in roots)
        {
            var settings = Path.Combine(data, "Settings.json"); if (!File.Exists(exe) || !File.Exists(settings)) continue;
            using var reader = new StreamReader(settings, detectEncodingFromByteOrderMarks: true);
            var parsed = JsonNode.Parse(reader.ReadToEnd()); var library = parsed?["WallpaperDir"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(library)) continue;
            // Store apps virtualize the ordinary LocalAppData path into the package's LocalCache.
            var logical = Path.Combine(local, "Lively Wallpaper");
            if (data != logical && library.StartsWith(logical + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                library = Path.Combine(data, Path.GetRelativePath(logical, library));
            if (!Directory.Exists(library)) throw new DirectoryNotFoundException("Lively's configured library is missing. Open Lively once and complete its setup.");
            return new(exe, library, settings);
        }
        throw new FileNotFoundException("Install Lively Wallpaper and open it once, then run RetroWave setup again.");
    }
    private static byte[] Resource(string name)
    {
        using var stream = typeof(WindowsSetup).Assembly.GetManifestResourceStream(name) ?? throw new InvalidDataException("Missing setup resource.");
        using var buffer = new MemoryStream(); stream.CopyTo(buffer); return buffer.ToArray();
    }
    public static void StopCompanion() => CompanionRuntime.Stop();
    public static string Install(bool companion, bool catalog)
    {
        var lively = DetectLively(); StopCompanion();
        var source = Environment.ProcessPath ?? throw new InvalidOperationException("Executable path is unavailable.");
        if (File.Exists(Path.ChangeExtension(source, ".runtimeconfig.json")) || Path.GetFileName(source).Equals("dotnet.exe", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Build the self-contained setup with scripts/build-windows.ps1 before installing.");
        if (companion)
        {
            var probe = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 43821);
            try { probe.Start(); } catch (System.Net.Sockets.SocketException) { throw new IOException("Another companion is using the playback port. Close the old PowerShell companion and run setup again."); } finally { probe.Stop(); }
        }
        Directory.CreateDirectory(Root);
        WallpaperInstaller.RequireChild(Root, Executable);
        WallpaperInstaller.RequireChild(Root, SetupExecutable);
        if (!Path.GetFullPath(source).Equals(SetupExecutable, StringComparison.OrdinalIgnoreCase))
        {
            File.Copy(source, SetupExecutable, true);
        }
        // The setup contains the independently published, self-contained worker.
        var payload = Resource("RetroWave.Companion.exe");
        var temporary = Executable + ".installing";
        File.WriteAllBytes(temporary, payload); File.Move(temporary, Executable, true);
        var installer = new WallpaperInstaller(Root, lively.Library);
        var state = installer.Install(System.Text.Encoding.UTF8.GetString(Resource("LivelyInfo.json")), Resource("thumbnail.jpg"), companion, catalog);
        using var startup = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run");
        if (companion) startup.SetValue("RetroWaveTV", $"\"{Executable}\" --run" + (catalog ? " --catalog" : ""));
        else startup.DeleteValue("RetroWaveTV", false);
        using var uninstall = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\RetroWaveTV");
        uninstall.SetValue("DisplayName", "RetroWave TV"); uninstall.SetValue("DisplayVersion", "3.0.0");
        uninstall.SetValue("Publisher", "RetroWave TV contributors"); uninstall.SetValue("InstallLocation", Root);
        uninstall.SetValue("UninstallString", $"\"{SetupExecutable}\" --uninstall"); uninstall.SetValue("NoModify", 1); uninstall.SetValue("NoRepair", 1);
        CreateDebuggerShortcut();
        if (companion)
        {
            Start(Executable, "--run", catalog ? "--catalog" : null);
        }
        var hostEntry = state.Entry;
        var logical = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Lively Wallpaper");
        var packageData = Path.GetDirectoryName(lively.SettingsPath)!;
        if (packageData != logical && hostEntry.StartsWith(packageData + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) hostEntry = Path.Combine(logical, Path.GetRelativePath(packageData, hostEntry));
        Start(lively.Executable, "setwp", "--file", hostEntry);
        DiagnosticLog.Write("installation_complete");
        return "RetroWave TV is configured. Lively was asked to apply it to the primary display." + (companion ? " The playback companion starts automatically when you sign in." : " Audio and cover colors use Lively directly; synced lyrics need the optional companion.");
    }
    private static void Start(string executable, params string?[] args)
    {
        var info = new ProcessStartInfo(executable) { UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden };
        foreach (var arg in args) if (arg is not null) info.ArgumentList.Add(arg);
        Process.Start(info)?.Dispose();
    }
    private static void CreateDebuggerShortcut()
    {
        var type = Type.GetTypeFromProgID("WScript.Shell") ?? throw new InvalidOperationException("Windows shortcut support is unavailable.");
        dynamic shell = Activator.CreateInstance(type)!;
        object? link = null;
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(DebuggerShortcut)!);
            link = shell.CreateShortcut(DebuggerShortcut);
            dynamic shortcut = link;
            shortcut.TargetPath = Executable; shortcut.Arguments = "--debug";
            shortcut.WorkingDirectory = Root; shortcut.Description = "RetroWave TV companion diagnostics";
            shortcut.Save();
        }
        finally
        {
            if (link is not null) System.Runtime.InteropServices.Marshal.FinalReleaseComObject(link);
            System.Runtime.InteropServices.Marshal.FinalReleaseComObject(shell);
        }
    }
    public static string Uninstall()
    {
        StopCompanion();
        File.Delete(DebuggerShortcut);
        using var startup = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
        if (startup?.GetValue("RetroWaveTV") is string command && command.StartsWith($"\"{Executable}\"", StringComparison.OrdinalIgnoreCase)) startup.DeleteValue("RetroWaveTV", false);
        Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\RetroWaveTV", false);
        var installer = new WallpaperInstaller(Root, ""); var state = installer.ReadState();
        var result = state is null ? "No RetroWave installation was found." : new WallpaperInstaller(Root, state.Library).Uninstall();
        // Windows cannot delete a running executable. Its built-in shell waits for this
        // process, then removes only our executable and an empty installation folder.
        if (File.Exists(Executable) || File.Exists(SetupExecutable))
        {
            static string Literal(string path) => "'" + path.Replace("'", "''") + "'";
            var statePath = Path.Combine(Root, "installation.json");
            var owned = new[] { Executable, SetupExecutable, Path.Combine(Root, "companion.log"), Path.Combine(Root, "companion.log.previous"), Path.Combine(Root, "diagnostics.json") };
            var paths = string.Join(",", owned.Select(Literal));
            var script = $"Wait-Process -Id {Environment.ProcessId} -ErrorAction SilentlyContinue; for ($attempt = 0; $attempt -lt 30; $attempt++) {{ if (Test-Path -LiteralPath {Literal(statePath)}) {{ break }}; @({paths}) | ForEach-Object {{ Remove-Item -LiteralPath $_ -Force -ErrorAction SilentlyContinue }}; if (-not (Test-Path -LiteralPath {Literal(Executable)}) -and -not (Test-Path -LiteralPath {Literal(SetupExecutable)})) {{ break }}; Start-Sleep -Seconds 1 }}; if (-not (Test-Path -LiteralPath {Literal(statePath)}) -and (Test-Path -LiteralPath {Literal(Root)}) -and -not (Get-ChildItem -LiteralPath {Literal(Root)} -Force)) {{ Remove-Item -LiteralPath {Literal(Root)} -ErrorAction SilentlyContinue }}";
            var encoded = Convert.ToBase64String(System.Text.Encoding.Unicode.GetBytes(script));
            Start(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe"), "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded);
        }
        return result + " Close setup to finish removing its executable. Close or replace RetroWave in Lively if it is still displayed.";
    }
}
