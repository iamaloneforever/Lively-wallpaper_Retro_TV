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
. (Join-Path $PSScriptRoot 'Resolve-Track.ps1')
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
  $album = [string]$media.AlbumTitle
  $trackId = Resolve-TrackId $title $artist $duration $album
  # Recheck the song after lookup so a track change cannot pair old lyrics with a new clock.
  $latest = Await-WinRT ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $latestArtist = [string]$latest.Artist; if (-not $latestArtist) { $latestArtist = [string]$latest.AlbumArtist }
  if ([string]$latest.Title -cne $title -or $latestArtist -cne $artist -or [string]$latest.AlbumTitle -cne $album) { return @{ status = 'track_changed' } }
  $timeline = $session.GetTimelineProperties(); $info = $session.GetPlaybackInfo(); $isPlaying = $info.PlaybackStatus.ToString() -eq 'Playing'
  $position = ($timeline.Position - $timeline.StartTime).TotalSeconds
  if ($isPlaying) { $position += [Math]::Max(0, ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds) * $rate }
  @{ title = $title; artist = $artist; trackId = $trackId; duration = $duration; position = [Math]::Min($duration, [Math]::Max(0, $position)); isPlaying = $isPlaying; rate = $rate; player = $session.SourceAppUserModelId; status = $(if ($trackId) { 'ready' } else { 'track_unmatched' }) }
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
