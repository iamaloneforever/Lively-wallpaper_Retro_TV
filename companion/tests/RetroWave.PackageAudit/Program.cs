using System.IO.Compression;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

if (args.Length != 2) throw new ArgumentException("Usage: PackageAudit <release.zip> <expected-licenses.zip>, or --historical <release.zip>");
var historical = args[0] == "--historical";
using var release = ZipFile.OpenRead(args[historical ? 1 : 0]);
if (release.Entries.Count != 1 || release.Entries[0].FullName != "RetroWave-Setup.exe") throw new InvalidDataException("Release ZIP must contain only the single installer executable.");
using var executable = new MemoryStream(); using (var stream = release.Entries[0].Open()) stream.CopyTo(executable);
var bytes = executable.ToArray();
var signature = Convert.FromHexString("8b1202b96a612038727b930214d7a03213f5b9e6efae3318ee3b2dce24b36aae");
var marker = bytes.AsSpan().IndexOf(signature);
if (marker < 8) throw new InvalidDataException("Not a .NET single-file executable.");
using var reader = new BinaryReader(executable, Encoding.UTF8, leaveOpen: true);
executable.Position = BitConverter.ToInt64(bytes, marker - 8);
var major = reader.ReadUInt32(); reader.ReadUInt32(); var count = reader.ReadInt32(); reader.ReadString();
if (major != 6) throw new InvalidDataException("Review audit parser for new .NET bundle format " + major);
reader.ReadInt64(); reader.ReadInt64(); reader.ReadInt64(); reader.ReadInt64(); reader.ReadUInt64();
var entries = new Dictionary<string, byte[]>();
for (var index = 0; index < count; index++)
{
    var offset = reader.ReadInt64(); var size = reader.ReadInt64(); var compressed = reader.ReadInt64(); reader.ReadByte(); var path = reader.ReadString();
    var resume = executable.Position;
    executable.Position = offset; var data = reader.ReadBytes(checked((int)(compressed > 0 ? compressed : size)));
    if (compressed > 0)
    {
        using var input = new MemoryStream(data); using var deflate = new DeflateStream(input, CompressionMode.Decompress); using var output = new MemoryStream(); deflate.CopyTo(output); data = output.ToArray();
    }
    if (data.LongLength != size || !entries.TryAdd(path, data)) throw new InvalidDataException("Invalid bundle entry: " + path);
    executable.Position = resume;
}
Console.WriteLine($"PASS inspected {count} actual executable bundle entries, including compressed assemblies/native files");
using var assembly = new MemoryStream(entries["RetroWave.dll"]);
using var pe = new PEReader(assembly);
var metadata = pe.GetMetadataReader();
byte[] Resource(string name)
{
    foreach (var handle in metadata.ManifestResources)
    {
        var resource = metadata.GetManifestResource(handle);
        if (metadata.GetString(resource.Name) != name || !resource.Implementation.IsNil) continue;
        var data = pe.GetSectionData(pe.PEHeaders.CorHeader!.ResourcesDirectory.RelativeVirtualAddress).GetReader(checked((int)resource.Offset), pe.PEHeaders.CorHeader.ResourcesDirectory.Size - checked((int)resource.Offset));
        return data.ReadBytes(data.ReadInt32());
    }
    throw new InvalidDataException("Missing embedded resource: " + name);
}
if (historical)
{
    Console.WriteLine("Historical embedded resources: " + string.Join(", ", metadata.ManifestResources.Select(handle => metadata.GetString(metadata.GetManifestResource(handle).Name))));
    using var oldRegistration = JsonDocument.Parse(Resource("LivelyInfo.json"));
    Console.WriteLine("Historical embedded wallpaper license: " + oldRegistration.RootElement.GetProperty("License").GetString());
    Console.WriteLine("Historical runtime configuration: " + Encoding.UTF8.GetString(entries["RetroWave.runtimeconfig.json"]));
    Console.WriteLine("Historical ZIP SHA-256: " + Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(args[1]))));
    return;
}
var licenseBytes = Resource("RetroWave.Licenses.zip");
if (!licenseBytes.SequenceEqual(File.ReadAllBytes(args[1]))) throw new InvalidDataException("Executable does not contain the exact generated license bundle.");
using var licenses = new ZipArchive(new MemoryStream(licenseBytes));
byte[] Material(string name)
{
    using var output = new MemoryStream(); using var input = (licenses.GetEntry(name) ?? throw new InvalidDataException("Missing license: " + name)).Open(); input.CopyTo(output); return output.ToArray();
}
using (var manifest = JsonDocument.Parse(Material("manifest.json")))
{
    foreach (var file in manifest.RootElement.EnumerateArray())
    {
        var data = Material(file.GetProperty("file").GetString()!);
        if (data.LongLength != file.GetProperty("size").GetInt64() || !Convert.ToHexString(SHA256.HashData(data)).Equals(file.GetProperty("sha256").GetString(), StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Incomplete license text.");
    }
}
if (!Material("RetroWave-MIT.txt").SequenceEqual(File.ReadAllBytes("LICENSE-MIT"))) throw new InvalidDataException("Companion MIT grant missing or modified.");
foreach (var name in new[] { "DOTNET-LIBRARY-LICENSE.txt", "WINDOWS-SDK-LICENSE.txt", "WPF-THIRD-PARTY-NOTICES.txt", "CsWinRT-MIT.txt", "PROVENANCE.md" })
    if (!Material(name).SequenceEqual(File.ReadAllBytes(Path.Combine("licenses/windows", name)))) throw new InvalidDataException("Incomplete supplemental terms: " + name);
using var registration = JsonDocument.Parse(Resource("LivelyInfo.json"));
if (registration.RootElement.GetProperty("License").GetString() != "AGPL-3.0") throw new InvalidDataException("Embedded wallpaper metadata has the wrong license.");
Console.WriteLine("PASS complete license texts, native Windows terms and AGPL metadata inside actual installer assembly resources");
using var inventory = JsonDocument.Parse(Material("inventory.json"));
var accounted = new HashSet<string>(["RetroWave.dll", "RetroWave.deps.json", "RetroWave.runtimeconfig.json"]);
foreach (var package in inventory.RootElement.EnumerateArray())
{
    foreach (var license in package.GetProperty("licenses").EnumerateArray()) Material(license.GetString()!);
    foreach (var file in package.GetProperty("files").EnumerateArray())
    {
        var path = file.GetProperty("path").GetString()!;
        if (path == "singlefilehost.exe (executable host template)") continue; // Native runtime host is patched by the SDK, not a bundled entry.
        if (!entries.TryGetValue(path, out var data)) throw new InvalidDataException("Inventory file absent from final executable: " + path);
        if (!Convert.ToHexString(SHA256.HashData(data)).Equals(file.GetProperty("sha256").GetString(), StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Runtime input changed after license inventory: " + path);
        accounted.Add(path);
    }
}
foreach (var path in entries.Keys) if (!accounted.Contains(path)) throw new InvalidDataException("Unattributed final bundle entry: " + path);
Console.WriteLine("PASS every bundled runtime file matches the licensed input inventory; no unattributed bundle entries");
Console.WriteLine("Static binary inspection passed. Windows execution, UI access and installer lifecycle require the Windows smoke job.");
