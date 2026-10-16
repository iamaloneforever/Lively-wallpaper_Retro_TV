using System.Text.Json;
using Microsoft.Win32;
namespace SpicyBond.Companion;

public sealed record ProviderPreference(string Name, bool Enabled, double Popularity = 50);
public sealed record AppSettings
{
    public string InstallDirectory { get; init; } = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "SpicyBond");
    public string Theme { get; init; } = "System";
    public bool ReducedAnimation { get; init; }
    public bool ExternalConsent { get; init; }
    public bool ExperimentalConsent { get; init; }
    public bool LrcLib { get; init; }
    public double LrcLibPopularity { get; init; } = 50;
    public bool Startup { get; init; }
    public ProviderPreference[] Providers { get; init; } = [new("ListenBrainz", true), new("MusicBrainz", true), new("Experimental Spotify", false), new("ACRCloud", false), new("Official Spotify", false), new("Apple iTunes", false)];
    public static string PathName => Path.Combine(CompanionRuntime.Root, "settings.json");
    public static AppSettings Load()
    {
        try
        {
            var loaded = JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(PathName), PlaybackSnapshot.Json) ?? new();
            var defaults = new AppSettings();
            var providers = (loaded.Providers ?? defaults.Providers).Where(p => p is not null && defaults.Providers.Any(d => d.Name == p.Name)).DistinctBy(p => p.Name).ToList();
            providers.AddRange(defaults.Providers.Where(p => !providers.Any(d => d.Name == p.Name)));
            var install = string.IsNullOrWhiteSpace(loaded.InstallDirectory) ? defaults.InstallDirectory : Path.GetFullPath(loaded.InstallDirectory);
            return loaded with { InstallDirectory = install, Providers = providers.Select(p => p with { Popularity = NormalizePopularity(p.Popularity) }).ToArray(), LrcLibPopularity = NormalizePopularity(loaded.LrcLibPopularity), Theme = loaded.Theme is "Light" or "Dark" or "System" ? loaded.Theme : "System" };
        }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException or ArgumentException)
        {
            var defaults = new AppSettings();
            if (Environment.GetEnvironmentVariable("SPICY_BOND_DATA_ROOT") is not null || File.Exists(PathName)) return defaults;
            try
            {
                var journal = Path.Combine(CompanionRuntime.LegacyRoot, "installation.json");
                var legacy = JsonSerializer.Deserialize<InstallationState>(File.ReadAllText(journal), PlaybackSnapshot.Json);
                using var startup = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run");
                var legacyExe = Path.Combine(CompanionRuntime.LegacyRoot, "RetroWave.Companion.exe");
                var start = startup?.GetValue("RetroWaveTV") is string command && command.StartsWith($"\"{legacyExe}\"", StringComparison.OrdinalIgnoreCase);
                return defaults with { ExternalConsent = legacy?.Catalog == true, Startup = start };
            }
            catch (Exception legacyError) when (legacyError is IOException or JsonException or UnauthorizedAccessException) { return defaults; }
        }
    }
    public static double NormalizePopularity(double value) => double.IsFinite(value) ? Math.Clamp(value, 0, 100) : 50;
    public void Save()
    {
        Directory.CreateDirectory(CompanionRuntime.Root);
        var temporary = PathName + ".tmp";
        File.WriteAllText(temporary, JsonSerializer.Serialize(this, PlaybackSnapshot.Json)); File.Move(temporary, PathName, true);
    }
    public static void SetStartup(bool enabled, string executable)
    {
        using var startup = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run");
        // Remove only an old startup command pointing into this user's known install.
        if (startup.GetValue("RetroWaveTV") is string legacyCommand &&
            (legacyCommand.StartsWith($"\"{Path.Combine(Load().InstallDirectory, "RetroWave.exe")}\"", StringComparison.OrdinalIgnoreCase) ||
             legacyCommand.StartsWith($"\"{Path.Combine(CompanionRuntime.LegacyRoot, "RetroWave.Companion.exe")}\"", StringComparison.OrdinalIgnoreCase))) startup.DeleteValue("RetroWaveTV", false);
        if (enabled) startup.SetValue("SpicyBond", $"\"{executable}\" --run");
        else if (startup.GetValue("SpicyBond") is string command && (command.StartsWith($"\"{executable}\"", StringComparison.OrdinalIgnoreCase) || command.StartsWith($"\"{Path.Combine(CompanionRuntime.LegacyRoot, "RetroWave.Companion.exe")}\"", StringComparison.OrdinalIgnoreCase))) startup.DeleteValue("SpicyBond", false);
    }
}
