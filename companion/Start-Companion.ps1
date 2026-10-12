# Windows PowerShell 5.1; reads Windows media sessions, never controls playback.
param([switch]$Once, [int]$Port = 43821)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await-WinRT($Operation, [Type]$Type) {
  $task = $asTask.MakeGenericMethod($Type).Invoke($null, @($Operation))
  if (-not $task.Wait(5000)) { throw 'Windows media request timed out.' }
  $task.Result
}
$manager = Await-WinRT ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$catalog = @{}
$spotifyToken = ''
$tokenExpiry = [DateTime]::MinValue
$mapPath = Join-Path $PSScriptRoot 'tracks.local.json'
$manualTracks = @{}
if (Test-Path -LiteralPath $mapPath) {
  $parsedMap = Get-Content -LiteralPath $mapPath -Raw | ConvertFrom-Json
  foreach ($property in $parsedMap.PSObject.Properties) { $manualTracks[$property.Name] = [string]$property.Value }
}
function Normalize-Name([string]$Value) { ($Value.Normalize().ToLowerInvariant() -replace '[^\p{L}\p{N}]', '') }
function Resolve-SpotifyId([string]$Title, [string]$Artist, [double]$Duration) {
  $identity = "$Title|$Artist"
  if ($manualTracks.ContainsKey($identity) -and $manualTracks[$identity] -match '^[a-zA-Z0-9]{22}$') { return $manualTracks[$identity] }
  if ($catalog.ContainsKey($identity) -and $catalog[$identity].expires -gt [DateTime]::UtcNow) { return $catalog[$identity].id }
  $id = ''
  if ($env:RETROWAVE_SPOTIFY_CLIENT_ID -and $env:RETROWAVE_SPOTIFY_CLIENT_SECRET) {
    try {
      if ($script:tokenExpiry -lt [DateTime]::UtcNow) {
        $credentials = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$($env:RETROWAVE_SPOTIFY_CLIENT_ID):$($env:RETROWAVE_SPOTIFY_CLIENT_SECRET)"))
        $token = Invoke-RestMethod -Method Post -Uri 'https://accounts.spotify.com/api/token' -Headers @{ Authorization = "Basic $credentials" } -Body @{ grant_type = 'client_credentials' } -TimeoutSec 7
        $script:spotifyToken = $token.access_token
        $script:tokenExpiry = [DateTime]::UtcNow.AddSeconds($token.expires_in - 60)
      }
      $query = [Uri]::EscapeDataString("track:$Title artist:$Artist")
      $results = Invoke-RestMethod -Uri "https://api.spotify.com/v1/search?type=track&limit=5&q=$query" -Headers @{ Authorization = "Bearer $script:spotifyToken" } -TimeoutSec 7
      $matches = @($results.tracks.items | Where-Object {
        (Normalize-Name $_.name) -eq (Normalize-Name $Title) -and
        @($_.artists | Where-Object { (Normalize-Name $_.name) -eq (Normalize-Name $Artist) }).Count -gt 0 -and
        [Math]::Abs($_.duration_ms / 1000 - $Duration) -lt 6
      })
      # Refuse ambiguous recordings with different durations.
      if ($matches.Count -gt 0 -and (@($matches | ForEach-Object { [Math]::Round($_.duration_ms / 1000) } | Select-Object -Unique).Count -eq 1)) { $id = $matches[0].id }
    } catch { Write-Warning 'Spotify catalogue lookup failed. Check local credentials and API access.' }
  }
  $catalog[$identity] = @{ id = $id; expires = [DateTime]::UtcNow.AddSeconds($(if ($id) { 3600 } else { 60 })) }
  $id
}
function Get-Playback {
  $sessions = @($manager.GetSessions())
  $session = $manager.GetCurrentSession()
  $playing = @($sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing' })
  if ($playing.Count -gt 0 -and (-not $session -or $session.GetPlaybackInfo().PlaybackStatus.ToString() -ne 'Playing')) { $session = $playing[0] }
  if (-not $session) { return @{ status = 'no_session' } }
  $media = Await-WinRT ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $timeline = $session.GetTimelineProperties()
  $info = $session.GetPlaybackInfo()
  $isPlaying = $info.PlaybackStatus.ToString() -eq 'Playing'
  $duration = ($timeline.EndTime - $timeline.StartTime).TotalSeconds
  $position = ($timeline.Position - $timeline.StartTime).TotalSeconds
  $rate = 1.0
  if ($null -ne $info.PlaybackRate) { $rate = [double]$info.PlaybackRate }
  if ($isPlaying) { $position += [Math]::Max(0, ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds) * $rate }
  if ($duration -le 0 -or $position -lt 0) { return @{ status = 'no_timeline'; player = $session.SourceAppUserModelId } }
  $title = [string]$media.Title
  $artist = [string]$media.Artist
  if (-not $artist) { $artist = [string]$media.AlbumArtist }
  $trackId = Resolve-SpotifyId $title $artist $duration
  # Snapshot after catalogue lookup so its network latency does not skew timing.
  $timeline = $session.GetTimelineProperties(); $info = $session.GetPlaybackInfo(); $isPlaying = $info.PlaybackStatus.ToString() -eq 'Playing'
  $position = ($timeline.Position - $timeline.StartTime).TotalSeconds
  if ($isPlaying) { $position += [Math]::Max(0, ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds) * $rate }
  @{ title = $title; artist = $artist; trackId = $trackId; duration = $duration; position = [Math]::Min($duration, [Math]::Max(0, $position)); isPlaying = $isPlaying; rate = $rate; player = $session.SourceAppUserModelId; status = $(if ($trackId) { 'ready' } else { 'catalogue_setup_required' }) }
}
if ($Once) { Get-Playback | ConvertTo-Json -Compress; exit }
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "RetroWave companion listening on 127.0.0.1:$Port. Close this window to stop."
$allowedOrigins = @('https://iamaloneforever.github.io', 'http://127.0.0.1:4173', 'http://127.0.0.1:5173')
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream(); $stream.ReadTimeout = 1500
      $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine(); $origin = ''; $headerCount = 0
      while (($header = $reader.ReadLine()) -and ++$headerCount -lt 50) { if ($header -match '^Origin:\s*(.+)$') { $origin = $Matches[1].Trim() } }
      $status = '200 OK'; $body = ''; $headers = ''
      if ($origin -notin $allowedOrigins) { $status = '403 Forbidden'; $body = '{"status":"origin_denied"}' }
      elseif ($requestLine -notmatch '^(GET|OPTIONS) /now-playing HTTP/1\.[01]$') { $status = '404 Not Found'; $body = '{}' }
      else {
        $headers = "Access-Control-Allow-Origin: $origin`r`nVary: Origin`r`nAccess-Control-Allow-Methods: GET, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`nAccess-Control-Allow-Private-Network: true`r`n"
        if ($requestLine.StartsWith('GET')) {
          try { $body = Get-Playback | ConvertTo-Json -Compress } catch { $body = '{"status":"media_unavailable"}' }
        }
      }
      $bytes = [Text.Encoding]::UTF8.GetBytes($body)
      $response = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`n${headers}Content-Type: application/json; charset=utf-8`r`nCache-Control: no-store`r`nConnection: close`r`nContent-Length: $($bytes.Length)`r`n`r`n")
      $stream.Write($response, 0, $response.Length); $stream.Write($bytes, 0, $bytes.Length)
    } catch { Write-Warning 'A companion request could not be read.' } finally { $client.Dispose() }
  }
} finally { $listener.Stop() }
