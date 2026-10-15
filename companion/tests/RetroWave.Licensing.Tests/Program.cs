using System.Text.Json;
using System.Text.Json.Nodes;
using RetroWave.Companion;

var root = Path.Combine(Path.GetTempPath(), "retrowave-licenses-" + Guid.NewGuid().ToString("N"));
var checks = 0;
void Check(bool condition, string label) { if (!condition) throw new Exception(label); checks++; Console.WriteLine("PASS " + label); }
try
{
    var library = Path.Combine(root, "library"); var data = Path.Combine(root, "data");
    var installer = new WallpaperInstaller(data, library);
    var template = File.ReadAllText("lively/LivelyInfo.json");
    var state = installer.Install(template, [], false, false);
    JsonObject Metadata(InstallationState registration) => JsonNode.Parse(File.ReadAllText(Path.Combine(registration.Entry, "LivelyInfo.json")))!.AsObject();
    Check(Metadata(state)["License"]!.GetValue<string>() == "AGPL-3.0", "new registration identifies combined wallpaper as AGPL");
    // Simulate the journal and metadata of an older, owned MIT registration.
    var old = Metadata(state); old["License"] = "MIT"; old["Title"] = "My TV"; old["CustomSetting"] = new JsonObject { ["volume"] = 17 };
    File.WriteAllText(Path.Combine(state.Entry, "LivelyInfo.json"), old.ToJsonString());
    var repaired = installer.Install(template, [], true, true);
    Check(repaired.Entry == state.Entry && Metadata(repaired)["License"]!.GetValue<string>() == "AGPL-3.0", "repair migrates existing owned MIT registration without duplication");
    Check(Metadata(repaired)["Title"]!.GetValue<string>() == "My TV" && Metadata(repaired)["CustomSetting"]!["volume"]!.GetValue<int>() == 17, "repair preserves unrelated registration settings");
    var repeat = installer.Install(template, [], false, false);
    Check(repeat.BridgeToken == repaired.BridgeToken && Metadata(repeat)["License"]!.GetValue<string>() == "AGPL-3.0", "repeat update is stable and preserves pairing");
    installer.Uninstall();
    var existing = Path.Combine(library, "wallpapers", "adopted"); Directory.CreateDirectory(existing);
    old["FileName"] = WallpaperInstaller.WallpaperUrl; old["Arguments"] = "--custom-flag --audio false";
    File.WriteAllText(Path.Combine(existing, "LivelyInfo.json"), old.ToJsonString());
    var adopted = installer.Install(template, [], false, false);
    Check(!adopted.Created && adopted.Entry == existing && Metadata(adopted)["License"]!.GetValue<string>() == "AGPL-3.0", "existing manually registered MIT wallpaper is migrated");
    Check(Metadata(adopted)["Arguments"]!.GetValue<string>().Contains("--custom-flag") && Metadata(adopted)["CustomSetting"]!["volume"]!.GetValue<int>() == 17, "adoption preserves custom launch flags and settings");
    installer.Uninstall();
    Check(Metadata(adopted)["License"]!.GetValue<string>() == "AGPL-3.0" && Metadata(adopted)["Arguments"]!.GetValue<string>() == old["Arguments"]!.GetValue<string>(), "uninstall restores unrelated original values without restoring a false MIT label");
    installer.Install(template, [], true, false);
    var editedPath = Path.Combine(adopted.Entry, "LivelyInfo.json");
    File.AppendAllText(editedPath, " "); var edited = File.ReadAllText(editedPath);
    installer.Uninstall();
    Check(File.ReadAllText(editedPath) == edited, "uninstall preserves user edits made after registration migration");
    if (typeof(LicenseMaterials).Assembly.GetManifestResourceNames().Contains("RetroWave.Licenses.zip"))
    {
        var output = LicenseMaterials.Extract(Path.Combine(root, "extracted"));
        Check(File.ReadAllBytes(Path.Combine(output, "RetroWave-MIT.txt")).SequenceEqual(File.ReadAllBytes("LICENSE-MIT")), "production extraction implementation returns the complete embedded MIT text");
        Check(File.Exists(Path.Combine(output, "index.html")) && File.Exists(Path.Combine(output, "DOTNET-LIBRARY-LICENSE.txt")), "production extraction includes offline index and runtime terms");
    }
}
finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
Console.WriteLine($"{checks} licensing behavior checks passed.");

namespace RetroWave.Companion
{
    // Only the installer's unrelated runtime/journal defaults are substituted;
    // the production migration and extraction implementations are linked above.
    public static class CompanionRuntime { public static string Root => Path.Combine(Path.GetTempPath(), "unused-retrowave-root"); public static string LegacyRoot => Root; }
    public static class PlaybackSnapshot { public static JsonSerializerOptions Json { get; } = new(JsonSerializerDefaults.Web); }
}
