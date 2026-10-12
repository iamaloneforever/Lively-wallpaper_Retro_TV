$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../companion/Resolve-Track.ps1')
$script:calls = 0
$script:rows = @()
function Invoke-CatalogRequest([string]$Path) { $script:calls++; $script:rows }
function Assert-Equal($Actual, $Expected, [string]$Label) {
  if ($Actual -cne $Expected) { throw "$Label failed: expected '$Expected', received '$Actual'." }
}
$candidate = @{ track_name = 'Test song'; artist_name = 'Test artist'; release_name = 'Test album'; spotify_track_ids = @('aaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbb') }
$script:rows = @($candidate)
Assert-Equal (Resolve-TrackId 'Test song' 'Test artist' 180 'Test album') 'aaaaaaaaaaaaaaaaaaaaaa' 'Public ID lookup'
Assert-Equal (Resolve-TrackId 'Test song' 'Test artist' 180 'Test album') 'aaaaaaaaaaaaaaaaaaaaaa' 'Cached lookup'
Assert-Equal $script:calls 1 'Cache avoids network requests'
$catalog.Clear(); $script:rows = @($candidate, $candidate)
Assert-Equal (Resolve-TrackId 'Test song' 'Test artist' 180 'Test album') '' 'Ambiguous recordings'
$catalog.Clear(); $script:rows = @($candidate)
Assert-Equal (Resolve-TrackId 'Test song' 'Other artist' 180 'Test album') '' 'Wrong artist'
$catalog.Clear()
Assert-Equal (Resolve-TrackId 'Test song' 'Test artist' 180 'Other album') '' 'Wrong album'
Assert-Equal (Resolve-TrackId 'Test song' 'Test artist' 180 '') '' 'Missing album'
$catalog.Clear(); $candidate.spotify_track_ids = @('invalid ID')
Assert-Equal (Resolve-TrackId 'Test song' 'Test artist' 180 'Test album') '' 'Malformed IDs'
$manualTracks['Test song|Test artist'] = 'bbbbbbbbbbbbbbbbbbbbbb'
Assert-Equal (Resolve-TrackId 'Test song' 'Test artist' 180 '') 'bbbbbbbbbbbbbbbbbbbbbb' 'Manual override without album'
Write-Host 'Companion resolver checks passed.'
