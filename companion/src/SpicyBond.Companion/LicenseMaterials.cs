using System.Diagnostics;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;

namespace SpicyBond.Companion;

public static class LicenseMaterials
{
    public static string Extract(string directory)
    {
        using var resource = typeof(LicenseMaterials).Assembly.GetManifestResourceStream("SpicyBond.Licenses.zip")
            ?? throw new InvalidOperationException("License bundle unavailable in this development build. Use scripts/build-windows.ps1 to build a distribution.");
        using var archive = new ZipArchive(resource, ZipArchiveMode.Read);
        var manifestEntry = archive.GetEntry("manifest.json") ?? throw new InvalidDataException("License manifest is missing.");
        using var manifestStream = manifestEntry.Open();
        using var manifest = JsonDocument.Parse(manifestStream);
        // Check complete contents before writing anything. Files are immutable
        // embedded resources, and the hash manifest also detects packaging errors.
        foreach (var file in manifest.RootElement.EnumerateArray())
        {
            var name = file.GetProperty("file").GetString()!;
            var entry = archive.GetEntry(name) ?? throw new InvalidDataException("Missing license material: " + name);
            using var stream = entry.Open();
            if (entry.Length != file.GetProperty("size").GetInt64() || !Convert.ToHexString(SHA256.HashData(stream)).Equals(file.GetProperty("sha256").GetString(), StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Incomplete license material: " + name);
        }
        directory = Path.GetFullPath(directory);
        foreach (var entry in archive.Entries)
        {
            if (entry.FullName != Path.GetFileName(entry.FullName)) throw new InvalidDataException("Invalid license material path.");
            var path = Path.Combine(directory, entry.FullName);
            WallpaperInstaller.RequireChild(directory, path);
            Directory.CreateDirectory(directory);
            using var source = entry.Open();
            using var destination = new FileStream(path, FileMode.Create, FileAccess.Write);
            source.CopyTo(destination);
        }
        return directory;
    }

    public static void Show()
    {
        var directory = Extract(Path.Combine(CompanionRuntime.Root, "licenses"));
        Process.Start(new ProcessStartInfo(Path.Combine(directory, "index.html")) { UseShellExecute = true })?.Dispose();
    }
}
