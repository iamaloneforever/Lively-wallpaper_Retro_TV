using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SpicyBond.Companion;

/// <summary>Desktop wallpaper players block browser downloads; the paired companion saves JSON exports.</summary>
public sealed class EffectExportStore(string? directory = null)
{
    private static (string Filename, string Text) Prepare(JsonElement request)
    {
        if (request.ValueKind != JsonValueKind.Object || !request.TryGetProperty("name", out var name) || name.ValueKind != JsonValueKind.String ||
            name.GetString() is not { } filename || !Regex.IsMatch(filename, "^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}\\.json$")) throw new JsonException("Invalid export filename.");
        if (!request.TryGetProperty("file", out var file)) throw new JsonException("Missing effect file.");
        // Reuse the companion's envelope/ID validation without interpreting shader code.
        using var wrapper = JsonDocument.Parse(JsonSerializer.Serialize(new { version = 1, config = new { }, customEffects = new { enabled = true, file } }));
        WallpaperSettingsStore.Parse(wrapper.RootElement);
        var text = JsonSerializer.Serialize(file, new JsonSerializerOptions { WriteIndented = true });
        if (Encoding.UTF8.GetByteCount(text) > WallpaperSettingsStore.MaxDocumentBytes) throw new JsonException("Export is too large.");
        return (filename, text + "\n");
    }
    public string Save(JsonElement request)
    {
        var (filename, text) = Prepare(request);
        var folder = Path.Combine(directory ?? CompanionRuntime.Root, "exports"); Directory.CreateDirectory(folder);
        var path = Path.Combine(folder, Path.GetFileNameWithoutExtension(filename) + "-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N")[..8] + ".json");
        using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        var bytes = new UTF8Encoding(false).GetBytes(text); stream.Write(bytes);
        return path;
    }
    public async Task<string?> SaveAsAsync(JsonElement request, Func<string, CancellationToken, Task<string?>> choosePath, CancellationToken cancellation)
    {
        var (filename, text) = Prepare(request);
        var path = await choosePath(filename, cancellation);
        cancellation.ThrowIfCancellationRequested();
        if (path is null) return null;
        // The destination comes exclusively from the native dialog, never from an HTTP path argument.
        var temporary = Path.Combine(Path.GetDirectoryName(Path.GetFullPath(path))!, ".spicy-bond-" + Guid.NewGuid().ToString("N") + ".tmp");
        try
        {
            await File.WriteAllTextAsync(temporary, text, new UTF8Encoding(false), cancellation);
            cancellation.ThrowIfCancellationRequested();
            File.Move(temporary, path, true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
        return path;
    }

}
