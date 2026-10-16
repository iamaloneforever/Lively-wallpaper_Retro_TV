using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace SpicyBond.Companion;

public sealed record InstallationState(string Library, string Entry, bool Created, string? Original, string InstalledHash, bool Companion, bool Catalog, string BridgeToken);

// Filesystem portion is isolated for contract tests against a disposable library.
public sealed class WallpaperInstaller(string installRoot, string library)
{
    public const string WallpaperUrl = Branding.WallpaperUrl;
    public const string Arguments = "--audio --system-nowplaying --pause-event true";
    private string StatePath => Path.Combine(installRoot, "installation.json");
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    public static bool IsRetroUrl(string? value) => Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == "https" && uri.Host == "iamaloneforever.github.io" && uri.AbsolutePath.TrimEnd('/') is "/Spicy-Bond" or "/Lively-wallpaper_Retro_TV";
    public static void RequireChild(string root, string child)
    {
        var fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!Path.GetFullPath(child).StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Installation path is outside its owning directory.");
        // Reparse points can redirect even a syntactically safe path to unrelated files.
        var current = new DirectoryInfo(Path.GetDirectoryName(Path.GetFullPath(child))!);
        while (current is not null && current.FullName.StartsWith(fullRoot.TrimEnd(Path.DirectorySeparatorChar), StringComparison.OrdinalIgnoreCase))
        {
            if (current.Exists && current.Attributes.HasFlag(FileAttributes.ReparsePoint)) throw new InvalidDataException("Installation path contains a reparse point.");
            current = current.Parent;
        }
    }
    public static void WriteAtomic(string path, string value)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temp = path + ".spicy-bond-tmp";
        File.WriteAllText(temp, value, new UTF8Encoding(false)); File.Move(temp, path, true);
    }
    public InstallationState? ReadState()
    {
        var path = StatePath;
        if (!File.Exists(path) && Path.GetFullPath(installRoot).Equals(CompanionRuntime.Root, StringComparison.OrdinalIgnoreCase)) path = Path.Combine(CompanionRuntime.LegacyRoot, "installation.json");
        return File.Exists(path) ? JsonSerializer.Deserialize<InstallationState>(File.ReadAllText(path), PlaybackSnapshot.Json) : null;
    }
    public InstallationState Install(string template, byte[] thumbnail, bool companion, bool catalog)
    {
        var wallpapers = Path.Combine(Path.GetFullPath(library), "wallpapers");
        Directory.CreateDirectory(wallpapers); Directory.CreateDirectory(installRoot);
        var old = ReadState();
        if (old is not null && !Path.GetFullPath(old.Library).Equals(Path.GetFullPath(library), StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Uninstall the previous setup before moving Lively's library.");
        string? entry = old?.Entry;
        if (entry is null)
        {
            foreach (var folder in Directory.EnumerateDirectories(wallpapers))
            {
                var path = Path.Combine(folder, "LivelyInfo.json");
                try { if (File.Exists(path) && IsRetroUrl(JsonNode.Parse(File.ReadAllText(path))?["FileName"]?.GetValue<string>())) { entry = folder; break; } }
                catch (Exception ex) when (ex is JsonException or IOException or InvalidOperationException) { }
            }
        }
        var created = old?.Created ?? entry is null;
        entry ??= Path.Combine(wallpapers, "spicy-bond-tv");
        if (created && old is null && Directory.Exists(entry)) entry = Path.Combine(wallpapers, "spicy-bond-tv-" + Guid.NewGuid().ToString("N"));
        RequireChild(wallpapers, Path.Combine(entry, "LivelyInfo.json"));
        var metadataPath = Path.Combine(entry, "LivelyInfo.json");
        var original = old?.Original ?? (File.Exists(metadataPath) ? File.ReadAllText(metadataPath) : null);
        var metadata = JsonNode.Parse(File.Exists(metadataPath) ? File.ReadAllText(metadataPath) : template)?.AsObject() ?? throw new InvalidDataException("Invalid Lively template.");
        // Adopting an existing paired registration must not rotate its key even
        // when the installer journal is absent. The journal remains authoritative.
        var registeredUrl = metadata["FileName"]?.GetValue<string>();
        var registeredToken = IsRetroUrl(registeredUrl)
            ? System.Text.RegularExpressions.Regex.Match(new Uri(registeredUrl!).Fragment, @"(?:^#|&)bridge=([a-f0-9]{64})(?:&|$)").Groups[1].Value
            : "";
        var bridgeToken = old?.BridgeToken ?? (registeredToken.Length == 64 ? registeredToken : Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant());
        metadata["FileName"] = companion ? WallpaperUrl + "#bridge=" + bridgeToken : WallpaperUrl; metadata["Type"] = 3;
        // Registration describes the combined web wallpaper, not the MIT companion.
        // Apply on every repair/update, including registrations adopted from Lively.
        metadata["License"] = "AGPL-3.0";
        if (metadata["Title"]?.GetValue<string>() is "RetroWave TV" or "RetroWave" or "SpicyBond") metadata["Title"] = Branding.Name;
        if (metadata["Contact"]?.GetValue<string>() == "https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV") metadata["Contact"] = Branding.Repository;
        var args = metadata["Arguments"]?.GetValue<string>() ?? "";
        args = System.Text.RegularExpressions.Regex.Replace(args, @"(?<!\S)--(?:audio|system-nowplaying)(?:\s+(?:true|false))?(?=\s|$)|(?<!\S)--pause-event\s+(?:true|false)(?=\s|$)", "");
        metadata["Arguments"] = (args.Trim() + " " + Arguments).Trim();
        if (created) { metadata["IsAbsolutePath"] = false; metadata["Thumbnail"] = thumbnail.Length > 0 ? "thumbnail.jpg" : ""; }
        var serialized = metadata.ToJsonString(new() { WriteIndented = true });
        // Journal before touching host metadata; interrupted installations can be repaired or undone.
        var state = new InstallationState(Path.GetFullPath(library), Path.GetFullPath(entry), created, original, Hash(serialized), companion, catalog, bridgeToken);
        WriteAtomic(StatePath, JsonSerializer.Serialize(state, PlaybackSnapshot.Json));
        Directory.CreateDirectory(entry);
        if (created)
        {
            var thumbnailPath = Path.Combine(entry, "thumbnail.jpg");
            if (thumbnail.Length > 0) File.WriteAllBytes(thumbnailPath, thumbnail);
            else File.Delete(thumbnailPath);
        }
        WriteAtomic(metadataPath, serialized);
        if (created) WriteAtomic(Path.Combine(entry, ".spicy-bond-owned"), "Spicy Bond");
        return state;
    }
    public string Uninstall()
    {
        var state = ReadState(); if (state is null) return "No Spicy Bond installation was found.";
        if (!Path.GetFullPath(state.Library).Equals(Path.GetFullPath(library), StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Library path does not match installation journal.");
        RequireChild(Path.Combine(library, "wallpapers"), Path.Combine(state.Entry, "LivelyInfo.json"));
        var metadataPath = Path.Combine(state.Entry, "LivelyInfo.json");
        var unchanged = !File.Exists(metadataPath) || Hash(File.ReadAllText(metadataPath)) == state.InstalledHash;
        var result = "Removed Spicy Bond setup.";
        if (!unchanged) result = "Removed companion setup; kept wallpaper metadata because you edited it after installation.";
        else if (state.Created)
        {
            if (File.Exists(Path.Combine(state.Entry, ".spicy-bond-owned")))
            {
                // Only delete our three files. Never delete user additions or unrelated library entries.
                foreach (var name in new[] { "LivelyInfo.json", "thumbnail.jpg", ".spicy-bond-owned" }) File.Delete(Path.Combine(state.Entry, name));
                if (!Directory.EnumerateFileSystemEntries(state.Entry).Any()) Directory.Delete(state.Entry);
            }
        }
        else if (state.Original is not null)
        {
            var original = JsonNode.Parse(state.Original)?.AsObject() ?? throw new InvalidDataException("Invalid original Lively metadata.");
            // Restoring unrelated host settings must not revive the old false label.
            if (IsRetroUrl(original["FileName"]?.GetValue<string>())) original["License"] = "AGPL-3.0";
            WriteAtomic(metadataPath, original.ToJsonString(new() { WriteIndented = true }));
        }
        File.Delete(StatePath); return result;
    }
}
