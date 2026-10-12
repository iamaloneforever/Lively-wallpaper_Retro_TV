using System.Text;
namespace RetroWave.Companion;
// Logs omit exception messages, song metadata, keys and paired URLs.
public static class DiagnosticLog
{
    private static readonly object Gate = new();
    public static string LogPath => Path.Combine(CompanionRuntime.Root, "companion.log");
    public static void Write(string code) => Append(LogPath, code);
    public static void Error(string component, Exception exception) => Write($"{component}_error {exception.GetType().Name} 0x{exception.HResult:X8}");
    public static void Append(string path, string code)
    {
        try
        {
            lock (Gate)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                if (File.Exists(path) && new FileInfo(path).Length > 256 * 1024) File.Move(path, path + ".previous", true);
                File.AppendAllText(path, $"{DateTimeOffset.UtcNow:O} {code.Replace('\r', ' ').Replace('\n', ' ')}\n", new UTF8Encoding(false));
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
    }
}
