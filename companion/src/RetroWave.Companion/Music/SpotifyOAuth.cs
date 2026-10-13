using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
namespace RetroWave.Companion.Music;

public static class SpotifyOAuth
{
    public const string Redirect = "http://127.0.0.1:43822/callback";
    private static string token = "";
    private static DateTimeOffset expires;
    private static string Base64Url(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    public static async Task AuthorizeAsync(string clientId, CancellationToken cancellation)
    {
        if (clientId.Length != 32 || !clientId.All(Uri.IsHexDigit)) throw new ProviderException("Enter a valid Spotify developer client ID");
        var verifier = Base64Url(RandomNumberGenerator.GetBytes(48)); var state = Base64Url(RandomNumberGenerator.GetBytes(32));
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        var listener = new TcpListener(IPAddress.Loopback, 43822); listener.Start(1);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation); timeout.CancelAfter(TimeSpan.FromMinutes(3));
        try
        {
            Process.Start(new ProcessStartInfo($"https://accounts.spotify.com/authorize?response_type=code&client_id={clientId}&redirect_uri={Uri.EscapeDataString(Redirect)}&code_challenge_method=S256&code_challenge={challenge}&state={state}") { UseShellExecute = true })?.Dispose();
            using var connection = await listener.AcceptTcpClientAsync(timeout.Token);
            using var stream = connection.GetStream();
            var bytes = new byte[8192]; var count = 0; var headerEnd = -1;
            while (count < bytes.Length && headerEnd < 0)
            {
                var loaded = await stream.ReadAsync(bytes.AsMemory(count), timeout.Token); if (loaded == 0) break;
                count += loaded; headerEnd = Encoding.ASCII.GetString(bytes, 0, count).IndexOf("\r\n\r\n", StringComparison.Ordinal);
            }
            var header = Encoding.ASCII.GetString(bytes, 0, count); var line = header.Split("\r\n")[0];
            if (headerEnd < 0 || !line.StartsWith("GET /callback?", StringComparison.Ordinal) || !header.Split("\r\n").Any(h => h.Equals("Host: 127.0.0.1:43822", StringComparison.OrdinalIgnoreCase))) throw new ProviderException("Invalid OAuth callback");
            var uri = new Uri("http://127.0.0.1" + line.Split(' ')[1]);
            var fields = uri.Query.TrimStart('?').Split('&').Select(s => s.Split('=', 2)).Where(s => s.Length == 2).ToDictionary(s => s[0], s => Uri.UnescapeDataString(s[1]));
            if (!fields.TryGetValue("state", out var returned) || !CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(state), Encoding.ASCII.GetBytes(returned)) || !fields.TryGetValue("code", out var code)) throw new ProviderException("Authorization cancelled or invalid state");
            var body = "RetroWave authorization received. You can close this tab.";
            await stream.WriteAsync(Encoding.ASCII.GetBytes($"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nConnection: close\r\nContent-Length: {body.Length}\r\n\r\n{body}"), timeout.Token);
            CredentialStore.Set("Spotify client ID", clientId);
            await ExchangeAsync(new() { ["grant_type"] = "authorization_code", ["code"] = code, ["redirect_uri"] = Redirect, ["client_id"] = clientId, ["code_verifier"] = verifier }, timeout.Token);
        }
        finally { listener.Stop(); }
    }
    public static async Task<string> AccessTokenAsync(CancellationToken cancellation)
    {
        if (token.Length > 0 && expires > DateTimeOffset.UtcNow.AddMinutes(1)) return token;
        await ExchangeAsync(new() { ["grant_type"] = "refresh_token", ["refresh_token"] = CredentialStore.Get("Spotify refresh token"), ["client_id"] = CredentialStore.Get("Spotify client ID") }, cancellation);
        return token;
    }
    private static async Task ExchangeAsync(Dictionary<string, string> fields, CancellationToken cancellation)
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(8) };
        using var content = new FormUrlEncodedContent(fields);
        using var response = await client.PostAsync("https://accounts.spotify.com/api/token", content, cancellation);
        if (!response.IsSuccessStatusCode) throw new ProviderException("Spotify authorization unavailable");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellation));
        token = json.RootElement.Text("access_token"); expires = DateTimeOffset.UtcNow.AddSeconds(json.RootElement.Number("expires_in"));
        if (token.Length == 0) throw new ProviderException("Invalid authorization response");
        var refresh = json.RootElement.Text("refresh_token");
        if (refresh.Length > 0) CredentialStore.Set("Spotify refresh token", refresh);
    }
}
