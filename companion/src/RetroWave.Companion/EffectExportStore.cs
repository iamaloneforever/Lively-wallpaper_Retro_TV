using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace RetroWave.Companion;

/// <summary>Desktop wallpaper players block browser downloads; the paired companion saves JSON exports.</summary>
public sealed class EffectExportStore(string? directory = null)
{
    public string Save(JsonElement request)
    {
        if (request.ValueKind != JsonValueKind.Object || !request.TryGetProperty("name", out var name) || name.ValueKind != JsonValueKind.String ||
            name.GetString() is not { } filename || !Regex.IsMatch(filename, "^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}\\.json$")) throw new JsonException("Invalid export filename.");
        if (!request.TryGetProperty("file", out var file)) throw new JsonException("Missing effect file.");
        // Reuse the companion's envelope/ID validation without interpreting shader code.
        using var wrapper = JsonDocument.Parse(JsonSerializer.Serialize(new { version = 1, config = new { }, customEffects = new { enabled = true, file } }));
        WallpaperSettingsStore.Parse(wrapper.RootElement);
        var text = JsonSerializer.Serialize(file, new JsonSerializerOptions { WriteIndented = true });
        if (Encoding.UTF8.GetByteCount(text) > WallpaperSettingsStore.MaxDocumentBytes) throw new JsonException("Export is too large.");
        var folder = Path.Combine(directory ?? CompanionRuntime.Root, "exports"); Directory.CreateDirectory(folder);
        var path = Path.Combine(folder, Path.GetFileNameWithoutExtension(filename) + "-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N")[..8] + ".json");
        using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        var bytes = new UTF8Encoding(false).GetBytes(text + "\n"); stream.Write(bytes);
        return path;
    }
}
