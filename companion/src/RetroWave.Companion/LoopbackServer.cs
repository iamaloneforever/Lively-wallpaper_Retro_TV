using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace RetroWave.Companion;

public sealed class LoopbackServer(string token, int port = LoopbackServer.Port)
{
    public const int Port = 43821;
    private static readonly HashSet<string> Origins = ["https://iamaloneforever.github.io", "http://127.0.0.1:4173", "http://127.0.0.1:5173"];
    public static bool IsAllowed(string host, string origin, int port = Port) => host == $"127.0.0.1:{port}" && Origins.Contains(origin);
    private readonly SemaphoreSlim connections = new(8);
    public async Task RunAsync(Func<PlaybackSnapshot> read, CancellationToken cancellation, Action<string, string, bool>? reportLyrics = null)
    {
        var listener = new TcpListener(IPAddress.Loopback, port); listener.Start(16);
        try
        {
            while (!cancellation.IsCancellationRequested)
            {
                var client = await listener.AcceptTcpClientAsync(cancellation);
                if (!connections.Wait(0)) { client.Dispose(); continue; }
                _ = RespondAsync(client, read, cancellation, reportLyrics);
            }
        }
        finally { listener.Stop(); }
    }
    private async Task RespondAsync(TcpClient client, Func<PlaybackSnapshot> read, CancellationToken cancellation, Action<string, string, bool>? reportLyrics)
    {
        using (client)
        using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation))
        {
            timeout.CancelAfter(2000);
            try
            {
                using var stream = client.GetStream();
                var bytes = new byte[8192]; var count = 0; var end = -1;
                while (count < bytes.Length && end < 0)
                {
                    var loaded = await stream.ReadAsync(bytes.AsMemory(count, bytes.Length - count), timeout.Token);
                    if (loaded == 0) return;
                    count += loaded; end = Encoding.ASCII.GetString(bytes, 0, count).IndexOf("\r\n\r\n", StringComparison.Ordinal);
                }
                if (end < 0) return;
                var lines = Encoding.ASCII.GetString(bytes, 0, end).Split("\r\n");
                var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var line in lines.Skip(1))
                {
                    var colon = line.IndexOf(':');
                    if (colon <= 0 || !headers.TryAdd(line[..colon], line[(colon + 1)..].Trim())) return;
                }
                var request = lines[0].Split(' ');
                var allowed = IsAllowed(headers.GetValueOrDefault("Host", ""), headers.GetValueOrDefault("Origin", ""), port);
                var receipt = request.Length == 3 && request[1] == "/lyrics-status" && reportLyrics is not null;
                var valid = request.Length == 3 && request[2] == "HTTP/1.1" && ((request[1] is "/now-playing" or "/now-playing?artwork=1" or "/inspector" or "/inspector?artwork=1") && request[0] is "GET" or "OPTIONS" || receipt && request[0] is "POST" or "OPTIONS");
                var supplied = headers.GetValueOrDefault("X-RetroWave-Key", "");
                var authenticated = request[0] == "OPTIONS" || System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(token));
                var code = !allowed || !authenticated ? "403 Forbidden" : !valid ? "404 Not Found" : "200 OK";
                if (allowed && authenticated && valid && receipt && request[0] == "POST")
                {
                    if (headers.ContainsKey("Transfer-Encoding") || !int.TryParse(headers.GetValueOrDefault("Content-Length"), out var length) || length is <= 0 or > 1024) code = "400 Bad Request";
                    else
                    {
                        var start = end + 4; var bodyBytes = new byte[length]; var available = Math.Min(length, count - start); Array.Copy(bytes, start, bodyBytes, 0, available);
                        while (available < length) { var loaded = await stream.ReadAsync(bodyBytes.AsMemory(available), timeout.Token); if (loaded == 0) return; available += loaded; }
                        try
                        {
                            using var json = JsonDocument.Parse(bodyBytes); var root = json.RootElement;
                            var key = Music.JsonFields.Text(root, "trackKey"); var source = Music.JsonFields.Text(root, "source");
                            if (key.Length != 64 || !key.All(Uri.IsHexDigit) || source is not ("" or "spicy_lyrics" or "lrclib")) code = "400 Bad Request";
                            else reportLyrics!(key, source, root.TryGetProperty("timed", out var timed) && timed.ValueKind == JsonValueKind.True);
                        }
                        catch (JsonException) { code = "400 Bad Request"; }
                    }
                }
                var data = read(); if (request.Length < 2 || request[1] is not ("/now-playing?artwork=1" or "/inspector?artwork=1")) data = data with { Thumbnail = "" };
                if (request.Length < 2 || request[1] is not ("/inspector" or "/inspector?artwork=1")) data = data with { Candidates = [], ProviderError = "", Providers = [] };
                var body = Encoding.UTF8.GetBytes(allowed && authenticated && valid && request[0] == "GET" ? JsonSerializer.Serialize(data, PlaybackSnapshot.Json) : "{}");
                var cors = allowed ? $"Access-Control-Allow-Origin: {headers["Origin"]}\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: X-RetroWave-Key, Content-Type\r\nAccess-Control-Allow-Private-Network: true\r\nVary: Origin\r\n" : "";
                var response = Encoding.ASCII.GetBytes($"HTTP/1.1 {code}\r\n{cors}Content-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\nContent-Length: {body.Length}\r\n\r\n");
                await stream.WriteAsync(response, timeout.Token); await stream.WriteAsync(body, timeout.Token);
            }
            catch (Exception ex) when (ex is IOException or SocketException or OperationCanceledException) { }
            finally { connections.Release(); }
        }
    }
}
