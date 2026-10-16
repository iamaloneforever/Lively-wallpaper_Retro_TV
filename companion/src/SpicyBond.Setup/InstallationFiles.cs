using SpicyBond.Companion;
namespace SpicyBond.Setup;

// Filesystem transaction kept independent of registration and Lively for deterministic failure tests.
public static class InstallationFiles
{
    public static void CopyForRelocation(string sourceDirectory, string destination, Action commitRegistration, Action rollbackRegistration)
    {
        sourceDirectory = Path.GetFullPath(sourceDirectory); destination = WindowsSetup.ValidateDestination(destination);
        var source = Path.Combine(sourceDirectory, "SpicyBond.exe"); var target = Path.Combine(destination, "SpicyBond.exe");
        WallpaperInstaller.RequireChild(sourceDirectory, source);
        if (sourceDirectory.Equals(destination, StringComparison.OrdinalIgnoreCase)) throw new IOException("Source and destination are the same.");
        if (!File.Exists(source) || !File.Exists(Path.Combine(sourceDirectory, ".spicy-bond-owned"))) throw new IOException("Source installation is not owned by SpicyBond.");
        if (File.Exists(target) || File.Exists(Path.Combine(destination, ".spicy-bond-owned"))) throw new IOException("Destination already has a Spicy Bond installation.");
        var temporary = Path.Combine(destination, Guid.NewGuid().ToString("N") + ".installing"); var copied = false; var marked = false;
        try
        {
            Directory.CreateDirectory(destination); File.Copy(source, temporary, false); File.Move(temporary, target, false); copied = true;
            File.WriteAllText(Path.Combine(destination, ".spicy-bond-owned"), "Spicy Bond 4"); marked = true;
            commitRegistration();
        }
        catch
        {
            try { rollbackRegistration(); }
            finally { File.Delete(temporary); if (copied) File.Delete(target); if (marked) File.Delete(Path.Combine(destination, ".spicy-bond-owned")); }
            throw;
        }
    }
}
