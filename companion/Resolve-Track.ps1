# Public catalogue lookup; no Spotify API, account, or credentials.
$catalog = @{}
$lastCatalogRequest = [DateTime]::MinValue
$mapPath = Join-Path $PSScriptRoot 'tracks.local.json'
$manualTracks = @{}
if (Test-Path -LiteralPath $mapPath) {
  $parsedMap = Get-Content -LiteralPath $mapPath -Raw | ConvertFrom-Json
  foreach ($property in $parsedMap.PSObject.Properties) { $manualTracks[$property.Name] = [string]$property.Value }
}
function Normalize-Name([string]$Value) { ($Value.Normalize().ToLowerInvariant() -replace '[^\p{L}\p{N}]', '') }
function Invoke-CatalogRequest([string]$Path) {
  # Space public catalogue requests and cache both matches and misses.
  $delay = 1100 - ([DateTime]::UtcNow - $script:lastCatalogRequest).TotalMilliseconds
  if ($delay -gt 0) { Start-Sleep -Milliseconds ([int][Math]::Ceiling($delay)) }
  $script:lastCatalogRequest = [DateTime]::UtcNow
  Invoke-RestMethod -Uri "https://labs.api.listenbrainz.org/$Path" -Headers @{ 'User-Agent' = 'RetroWaveTV/1.0 (https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV)' } -TimeoutSec 4
}
function Resolve-TrackId([string]$Title, [string]$Artist, [double]$Duration, [string]$Album) {
  $identity = "$Title|$Artist"
  if ($manualTracks.ContainsKey($identity) -and $manualTracks[$identity] -match '^[a-zA-Z0-9]{22}$') { return $manualTracks[$identity] }
  $cacheKey = "$identity|$Album|$([Math]::Round($Duration))"
  if ($catalog.ContainsKey($cacheKey) -and $catalog[$cacheKey].expires -gt [DateTime]::UtcNow) { return $catalog[$cacheKey].id }
  if (-not $Title -or -not $Artist -or -not $Album -or $Duration -le 0) { return '' }
  $id = ''
  try {
    $query = 'artist_name=' + [Uri]::EscapeDataString($Artist) + '&track_name=' + [Uri]::EscapeDataString($Title) + '&release_name=' + [Uri]::EscapeDataString($Album)
    $results = @(Invoke-CatalogRequest "spotify-id-from-metadata/json?$query")
    $candidates = @($results | Where-Object {
      (Normalize-Name $_.track_name) -eq (Normalize-Name $Title) -and
      (Normalize-Name $_.artist_name) -eq (Normalize-Name $Artist) -and
      (Normalize-Name $_.release_name) -eq (Normalize-Name $Album)
    })
    # Each row is a catalogue match; its IDs are variants of the same metadata.
    # Reject competing rows instead of guessing between albums or recordings.
    if ($candidates.Count -eq 1) {
      $ids = @($candidates[0].spotify_track_ids | Where-Object { $_ -cmatch '^[A-Za-z0-9]{22}$' } | Select-Object -Unique)
      if ($ids.Count -gt 0) { $id = $ids[0] }
    }
  } catch { Write-Warning 'Public catalogue lookup unavailable; retrying later. A local track mapping can also be used.' }
  if ($catalog.Count -ge 256) { $catalog.Clear() }
  $catalog[$cacheKey] = @{ id = $id; expires = [DateTime]::UtcNow.AddSeconds($(if ($id) { 21600 } else { 300 })) }
  $id
}
