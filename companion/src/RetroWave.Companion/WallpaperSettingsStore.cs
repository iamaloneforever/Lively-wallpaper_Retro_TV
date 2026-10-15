using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace RetroWave.Companion;

public sealed record WallpaperSettingsDocument(int Version, Dictionary<string, JsonElement> Config, string LyricsKey);
public sealed record WallpaperSettingsState(bool Initialized, string Revision, WallpaperSettingsDocument Settings);
public sealed class WallpaperSettingsConflictException : Exception { }

/// <summary>User preferences live outside the installed binaries and survive repair and updates.</summary>
public sealed class WallpaperSettingsStore(string? directory = null)
{
    private static readonly object Gate = new();
    public string PathName => Path.Combine(directory ?? CompanionRuntime.Root, "wallpaper-settings.json");
    private static readonly JsonSerializerOptions Json = new(PlaybackSnapshot.Json) { WriteIndented = true };
    private const string Defaults = """
        {"mode":"broadcast","casing":"wood","brightness":1,"intensity":0.65,"fps":60,"lowPower":false,
        "antenna":true,"clock":true,"scanlines":true,"aberration":true,"noise":true,"curvature":true,
        "glow":true,"reflections":true,"interference":true,"particles":true,"lyrics":true,"publicLyrics":false,
        "songAccents":true,"particleStyle":"auto","autoGenre":true,"manualTheme":"auto","defaultTheme":"synthwave","backgroundAnimation":true,
        "backgroundIntensity":0.65,"reactivity":1,"particleDensity":0.7,"backgroundGlow":0.65,"analogIntensity":0.65,
        "backgroundBrightness":0.85,"transitionDuration":3,"reducedMotion":false,"performancePreset":"balanced",
        "lyricStyle":"smooth","lyricSize":1,"lyricIntensity":0.65,"lyricOffset":0,"lyricColor":"automatic"}
        """;
    private static bool Theme(string? value) => value is "synthwave" or "electronic" or "pop" or "rock" or "hiphop" or "jazz" or "classical" or "ambient" or "lofi" or "soul" or "indie";
    public static WallpaperSettingsDocument Parse(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("version", out var version) || !version.TryGetInt32(out var schema) || schema != 1 ||
            !root.TryGetProperty("config", out var config) || config.ValueKind != JsonValueKind.Object) throw new JsonException("Unsupported wallpaper settings.");
        var result = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(Defaults)!;
        foreach (var field in config.EnumerateObject())
        {
            if (!result.TryGetValue(field.Name, out var fallback)) continue;
            var value = field.Value;
            if (fallback.ValueKind is JsonValueKind.True or JsonValueKind.False)
            { if (value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) throw new JsonException("Invalid toggle."); }
            else if (fallback.ValueKind == JsonValueKind.String)
            {
                if (value.ValueKind != JsonValueKind.String) throw new JsonException("Invalid option.");
                var valid = field.Name switch { "mode" => value.GetString() is "broadcast" or "vinyl", "casing" => value.GetString() is "wood" or "beige", "lyricStyle" => value.GetString() is "smooth" or "classic" or "minimal", "lyricColor" => value.GetString() is "automatic" or "neutral",
                    "particleStyle" => value.GetString() is "auto" or "sparkles" or "dust" or "rain" or "embers" or "bokeh" or "fireflies",
                    "manualTheme" => value.GetString() == "auto" || Theme(value.GetString()), "defaultTheme" => Theme(value.GetString()),
                    "performancePreset" => value.GetString() is "low" or "balanced" or "high" or "ultra", _ => false };
                if (!valid) throw new JsonException("Unsupported option.");
            }
            else
            {
                if (value.ValueKind != JsonValueKind.Number || !value.TryGetDouble(out var number) || !double.IsFinite(number)) throw new JsonException("Invalid number.");
                var valid = field.Name switch { "fps" => number is 30 or 60, "brightness" => number is >= .3 and <= 1.5, "intensity" => number is >= .2 and <= 1.5, "lyricSize" => number is >= .65 and <= 1.35, "lyricIntensity" => number is >= 0 and <= 1, "lyricOffset" => number is >= -30 and <= 30,
                    "backgroundIntensity" or "backgroundGlow" => number is >= 0 and <= 1.5,
                    "reactivity" => number is >= 0 and <= 2, "particleDensity" or "analogIntensity" => number is >= 0 and <= 1,
                    "backgroundBrightness" => number is >= .1 and <= 1.5, "transitionDuration" => number is >= .3 and <= 10, _ => false };
                if (!valid) throw new JsonException("Number outside supported range.");
            }
            result[field.Name] = value.Clone();
        }
        var key = "";
        if (root.TryGetProperty("lyricsKey", out var rawKey))
        {
            if (rawKey.ValueKind != JsonValueKind.String) throw new JsonException("Invalid lyrics key.");
            key = rawKey.GetString()!.Trim();
        }
        if (key.Length > 256 || key.Length > 0 && !Regex.IsMatch(key, "^sl_pk_[A-Za-z0-9_-]+$")) throw new JsonException("Use a publishable lyrics key.");
        return new(1, result, key);
    }
    public WallpaperSettingsState Read()
    {
        lock (Gate) return ReadCore();
    }
    private WallpaperSettingsState ReadCore()
    {
        if (!File.Exists(PathName))
        {
            using var defaults = JsonDocument.Parse("{\"version\":1,\"config\":" + Defaults + "}");
            return new(false, "", Parse(defaults.RootElement));
        }
        if (new FileInfo(PathName).Length > 8192) throw new JsonException("Settings file is too large.");
        var bytes = File.ReadAllBytes(PathName);
        if (bytes.Length > 8192) throw new JsonException("Settings file is too large.");
        using var json = JsonDocument.Parse(Encoding.UTF8.GetString(bytes).TrimStart('\uFEFF'));
        return new(true, Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(), Parse(json.RootElement));
    }
    public WallpaperSettingsState Save(JsonElement root, string expectedRevision)
    {
        var document = Parse(root);
        lock (Gate)
        {
            if (ReadCore().Revision != expectedRevision) throw new WallpaperSettingsConflictException();
            Directory.CreateDirectory(Path.GetDirectoryName(PathName)!);
            var temporary = PathName + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try { File.WriteAllText(temporary, JsonSerializer.Serialize(document, Json), new UTF8Encoding(false)); File.Move(temporary, PathName, true); }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
            return ReadCore();
        }
    }
}
