using System.Diagnostics;
using SpicyBond.Companion;
using System.Text.Json.Nodes;
using Microsoft.Win32;
using Windows.Management.Deployment;

namespace SpicyBond.Setup;

public sealed record LivelyInstallation(string Executable, string Library, string SettingsPath);
public static class WindowsSetup
{
    public static string Root => CompanionRuntime.Root;
    public static string Executable => CompanionRuntime.Executable;
    public static string SetupExecutable => Executable;
    public static string AppShortcut => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "SpicyBond.lnk");
    public static string LegacyShortcut => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "RetroWave TV Debugger.lnk");



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
        throw new FileNotFoundException("Install Lively Wallpaper and open it once, then run Spicy Bond setup again.");
    }
    private static byte[] Resource(string name)
    {
        using var stream = typeof(WindowsSetup).Assembly.GetManifestResourceStream(name) ?? throw new InvalidDataException("Missing setup resource.");
        using var buffer = new MemoryStream(); stream.CopyTo(buffer); return buffer.ToArray();
    }
    public static void StopCompanion() => CompanionRuntime.Stop();
    public static string Install(bool companion, bool catalog, bool? startupChoice = null, string? destination = null, bool desktop = false, bool launch = false, bool? lrcLib = null, bool? experimentalConsent = null)
    {
        using var lease = new SetupLease();
        var lively = DetectLively();
        var source = Environment.ProcessPath ?? throw new InvalidOperationException("Executable path is unavailable.");
        if (File.Exists(Path.ChangeExtension(source, ".runtimeconfig.json")) || Path.GetFileName(source).Equals("dotnet.exe", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Build the self-contained setup with scripts/build-windows.ps1 before installing.");
        var currentSettings = AppSettings.Load();
        var validatedDestination = ValidateDestination(destination ?? currentSettings.InstallDirectory);
        if (destination is not null && !Path.GetFullPath(destination).TrimEnd(Path.DirectorySeparatorChar).Equals(currentSettings.InstallDirectory.TrimEnd(Path.DirectorySeparatorChar), StringComparison.OrdinalIgnoreCase) && File.Exists(Path.Combine(currentSettings.InstallDirectory, ".spicy-bond-owned"))) Relocate(destination, restartCompanion: false);
        StopCompanion();
        if (companion)
        {
            var probe = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 43821);
            try { probe.Start(); } catch (System.Net.Sockets.SocketException) { throw new IOException("Another companion is using the playback port. Close the old PowerShell companion and run setup again."); } finally { probe.Stop(); }
        }
        var previous = AppSettings.Load();
        var target = validatedDestination;
        var targetExe = Path.Combine(target, "SpicyBond.exe");
        Directory.CreateDirectory(Root); Directory.CreateDirectory(target);
        var ownedMarker = Path.Combine(target, ".spicy-bond-owned");
        if (File.Exists(targetExe) && !File.Exists(ownedMarker) && !Path.GetFullPath(source).Equals(targetExe, StringComparison.OrdinalIgnoreCase)) throw new IOException("This folder already has an unowned SpicyBond.exe. Choose another folder.");
        WallpaperInstaller.RequireChild(target, targetExe);
        if (!Path.GetFullPath(source).Equals(targetExe, StringComparison.OrdinalIgnoreCase))
        {
            var temporary = targetExe + "." + Guid.NewGuid().ToString("N") + ".installing"; File.Copy(source, temporary, false); File.Move(temporary, targetExe, true);
        }
        File.WriteAllText(ownedMarker, "Spicy Bond 4");
        // Persist all selected sharing preferences before starting the worker.
        var preferences = previous with
        {
            InstallDirectory = target, ExternalConsent = catalog, Startup = companion && (startupChoice ?? previous.Startup),
            LrcLib = lrcLib ?? previous.LrcLib, ExperimentalConsent = experimentalConsent ?? previous.ExperimentalConsent,
            Providers = experimentalConsent is bool consent
                ? previous.Providers.Select(p => p.Name == "Experimental Spotify" ? p with { Enabled = consent } : p).ToArray()
                : previous.Providers
        };
        preferences.Save();
        var installer = new WallpaperInstaller(Root, lively.Library);
        var state = installer.Install(System.Text.Encoding.UTF8.GetString(Resource("LivelyInfo.json")), Array.Empty<byte>(), companion, catalog);
        AppSettings.SetStartup(preferences.Startup, Executable);
        using var uninstall = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\SpicyBond");
        uninstall.SetValue("DisplayName", Branding.Name); uninstall.SetValue("DisplayVersion", "4.0.0");
        uninstall.SetValue("Publisher", Branding.Contributors); uninstall.SetValue("InstallLocation", target);
        uninstall.SetValue("DisplayIcon", Executable);
        uninstall.DeleteValue("NoModify", false); uninstall.DeleteValue("NoRepair", false);
        uninstall.SetValue("UninstallString", $"\"{Executable}\" --uninstall"); uninstall.SetValue("ModifyPath", $"\"{Executable}\" --setup");
        File.Delete(LegacyShortcut); CreateShortcut(AppShortcut);
        if (desktop) CreateShortcut(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "SpicyBond.lnk"));
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
        var legacyJournal = Path.Combine(CompanionRuntime.LegacyRoot, "installation.json");
        if (Environment.GetEnvironmentVariable("SPICY_BOND_DATA_ROOT") is null && File.Exists(legacyJournal))
        {
            var old = System.Text.Json.JsonSerializer.Deserialize<InstallationState>(File.ReadAllText(legacyJournal), PlaybackSnapshot.Json);
            if (old?.BridgeToken == state.BridgeToken) { File.Delete(legacyJournal); ScheduleLegacyCleanup(); }
        }
        if (launch) Start(Executable);
        return "Spicy Bond is installed in " + target + "." + (preferences.Startup ? " Sign-in startup is enabled." : " Sign-in startup is off.");
    }
    private static void Start(string executable, params string?[] args)
    {
        var info = new ProcessStartInfo(executable) { UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden };
        foreach (var arg in args) if (arg is not null) info.ArgumentList.Add(arg);
        Process.Start(info)?.Dispose();
    }
    private static void CreateShortcut(string path)
    {
        var type = Type.GetTypeFromProgID("WScript.Shell") ?? throw new InvalidOperationException("Windows shortcut support is unavailable.");
        dynamic shell = Activator.CreateInstance(type)!;
        object? link = null;
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            link = shell.CreateShortcut(path);
            dynamic shortcut = link;
            shortcut.TargetPath = Executable; shortcut.Arguments = "";
            shortcut.WorkingDirectory = CompanionRuntime.InstallDirectory; shortcut.Description = "Spicy Bond music companion"; shortcut.IconLocation = Executable + ",0";
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
        using var lease = new SetupLease();
        StopCompanion();
        File.Delete(AppShortcut); File.Delete(LegacyShortcut);
        File.Delete(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "SpicyBond.lnk"));
        using var startup = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
        if (startup?.GetValue("SpicyBond") is string command && command.StartsWith($"\"{Executable}\"", StringComparison.OrdinalIgnoreCase)) startup.DeleteValue("SpicyBond", false);
        Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\SpicyBond", false);
        var installer = new WallpaperInstaller(Root, ""); var state = installer.ReadState();
        var result = state is null ? "No Spicy Bond installation was found." : new WallpaperInstaller(Root, state.Library).Uninstall();
        // Windows cannot delete a running executable. Its built-in shell waits for this
        // process, then removes only our executable and an empty installation folder.
        if (File.Exists(Executable) || File.Exists(SetupExecutable))
        {
            static string Literal(string path) => "'" + path.Replace("'", "''") + "'";
            var statePath = Path.Combine(Root, "installation.json");
            var binaryRoot = CompanionRuntime.InstallDirectory;
            WallpaperInstaller.RequireChild(binaryRoot, Executable);
            if (!File.Exists(Path.Combine(binaryRoot, ".spicy-bond-owned"))) return result + " Kept unowned application files.";
            var marker = Path.Combine(binaryRoot, ".spicy-bond-owned");
            var script = $"Wait-Process -Id {Environment.ProcessId} -ErrorAction SilentlyContinue; for ($attempt = 0; $attempt -lt 30; $attempt++) {{ if (Test-Path -LiteralPath {Literal(statePath)}) {{ break }}; Remove-Item -LiteralPath {Literal(Executable)} -Force -ErrorAction SilentlyContinue; if (-not (Test-Path -LiteralPath {Literal(Executable)})) {{ Remove-Item -LiteralPath {Literal(marker)} -Force -ErrorAction SilentlyContinue; break }}; Start-Sleep -Seconds 1 }}; if (-not (Test-Path -LiteralPath {Literal(statePath)}) -and (Test-Path -LiteralPath {Literal(binaryRoot)}) -and -not (Get-ChildItem -LiteralPath {Literal(binaryRoot)} -Force)) {{ Remove-Item -LiteralPath {Literal(binaryRoot)} -ErrorAction SilentlyContinue }}";
            var encoded = Convert.ToBase64String(System.Text.Encoding.Unicode.GetBytes(script));
            Start(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe"), "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded);
        }
        return result + " Close setup to finish removing its executable. Close or replace Spicy Bond in Lively if it is still displayed.";
    }
    public static string ValidateDestination(string destination)
    {
        var full = Path.GetFullPath(destination).TrimEnd(Path.DirectorySeparatorChar);
        if (full.Length <= Path.GetPathRoot(full)!.Length) throw new IOException("Choose a subfolder, not a drive root.");
        WallpaperInstaller.RequireChild(full, Path.Combine(full, "SpicyBond.exe"));
        var ancestor = new DirectoryInfo(full);
        for (var parent = ancestor; parent is not null; parent = parent.Parent)
            if (parent.Exists && parent.Attributes.HasFlag(FileAttributes.ReparsePoint)) throw new IOException("Choose a folder without junctions or symbolic links.");
        while (!ancestor.Exists && ancestor.Parent is not null) ancestor = ancestor.Parent;
        var drive = new DriveInfo(Path.GetPathRoot(full)!);
        if (drive.IsReady && drive.AvailableFreeSpace < 300_000_000) throw new IOException("At least 300 MB of free space is required.");
        var probe = Path.Combine(ancestor.FullName, ".spicy-bond-write-" + Guid.NewGuid().ToString("N"));
        try { File.WriteAllText(probe, ""); File.Delete(probe); }
        catch (UnauthorizedAccessException) { throw new IOException("This folder needs administrator permission. Choose a folder writable by your account."); }
        return full;
    }
    public static void Relocate(string destination, bool restartCompanion = true)
    {
        using var lease = new SetupLease();
        var previous = AppSettings.Load(); var source = Path.Combine(previous.InstallDirectory, "SpicyBond.exe");
        var target = ValidateDestination(destination); var targetExe = Path.Combine(target, "SpicyBond.exe");
        if (target.Equals(previous.InstallDirectory, StringComparison.OrdinalIgnoreCase)) return;
        if (!File.Exists(source) || !File.Exists(Path.Combine(previous.InstallDirectory, ".spicy-bond-owned"))) throw new IOException("Repair this installation before moving it.");
        if (File.Exists(targetExe) || File.Exists(Path.Combine(target, ".spicy-bond-owned"))) throw new IOException("Choose a destination without an existing Spicy Bond installation.");
        StopCompanion();
        InstallationFiles.CopyForRelocation(previous.InstallDirectory, target, () =>
        {
            (previous with { InstallDirectory = target }).Save();
            AppSettings.SetStartup(previous.Startup, targetExe); CreateShortcut(AppShortcut);
            var desktop = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "SpicyBond.lnk"); if (File.Exists(desktop)) CreateShortcut(desktop);
            using var uninstall = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\SpicyBond");
            uninstall.SetValue("InstallLocation", target); uninstall.SetValue("DisplayIcon", targetExe); uninstall.SetValue("UninstallString", $"\"{targetExe}\" --uninstall"); uninstall.SetValue("ModifyPath", $"\"{targetExe}\" --setup");
            if (restartCompanion && new WallpaperInstaller(Root, "").ReadState()?.Companion == true) Start(targetExe, "--run");
        }, () =>
        {
            previous.Save(); AppSettings.SetStartup(previous.Startup, source); CreateShortcut(AppShortcut);
            var desktop = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "SpicyBond.lnk"); if (File.Exists(desktop)) CreateShortcut(desktop);
            using var uninstall = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\SpicyBond");
            uninstall.SetValue("InstallLocation", previous.InstallDirectory); uninstall.SetValue("DisplayIcon", source); uninstall.SetValue("UninstallString", $"\"{source}\" --uninstall"); uninstall.SetValue("ModifyPath", $"\"{source}\" --setup");
            if (restartCompanion && new WallpaperInstaller(Root, "").ReadState()?.Companion == true) Start(source, "--run");
        });
        // Source may still host the setup UI. Remove only these owned files after it exits.
        ScheduleOwnedCleanup(previous.InstallDirectory, source);
    }
    private static void ScheduleOwnedCleanup(string directory, string executable)
    {
        WallpaperInstaller.RequireChild(directory, executable);
        static string Literal(string value) => "'" + value.Replace("'", "''") + "'";
        var script = $"Wait-Process -Id {Environment.ProcessId} -ErrorAction SilentlyContinue; Remove-Item -LiteralPath {Literal(executable)} -Force -ErrorAction SilentlyContinue; if (-not (Test-Path -LiteralPath {Literal(executable)})) {{ Remove-Item -LiteralPath {Literal(Path.Combine(directory, ".spicy-bond-owned"))} -Force -ErrorAction SilentlyContinue }}; if ((Test-Path -LiteralPath {Literal(directory)}) -and -not (Get-ChildItem -LiteralPath {Literal(directory)} -Force)) {{ Remove-Item -LiteralPath {Literal(directory)} -ErrorAction SilentlyContinue }}";
        Start(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe"), "-NoProfile", "-NonInteractive", "-EncodedCommand", Convert.ToBase64String(System.Text.Encoding.Unicode.GetBytes(script)));
    }
    private static void ScheduleLegacyCleanup()
    {
        var directory = CompanionRuntime.LegacyRoot;
        foreach (var name in new[] { "RetroWave.Companion.exe", "RetroWave-Setup.exe" })
        {
            var executable = Path.Combine(directory, name);
            if (File.Exists(executable)) ScheduleOwnedCleanup(directory, executable);
        }
    }
    private sealed class SetupLease : IDisposable
    {
        private readonly Mutex mutex = new(false, CompanionRuntime.MutexName + "-Setup");
        public SetupLease()
        {
            try { if (!mutex.WaitOne(0)) { mutex.Dispose(); throw new IOException("Another Spicy Bond setup is running. Close it and try again."); } }
            catch (AbandonedMutexException) { }
        }
        public void Dispose() { mutex.ReleaseMutex(); mutex.Dispose(); }
    }
}
