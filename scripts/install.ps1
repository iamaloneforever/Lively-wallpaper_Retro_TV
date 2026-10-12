# Build a small Lively import ZIP. The actual wallpaper stays hosted on GitHub Pages.
[CmdletBinding()]
param([switch]$OpenFolder)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$jsonPath = Join-Path $root 'lively\LivelyInfo.json'
if (!(Test-Path $jsonPath)) { throw "Missing $jsonPath" }
$info = Get-Content -Raw $jsonPath | ConvertFrom-Json
if ($info.Type -ne 3 -or $info.FileName -notmatch '^https://') {
    throw 'Expected a Lively web wallpaper (Type 3) with an HTTPS FileName.'
}
$zipPath = Join-Path $PSScriptRoot 'RetroWave-TV-Lively.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -LiteralPath $jsonPath -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "Created $zipPath" -ForegroundColor Green
Write-Host 'Import the ZIP using Lively Wallpaper > Add Wallpaper.'
Write-Host 'After importing, use scripts/run.ps1 to activate the wallpaper.'
if ($OpenFolder) { Start-Process explorer.exe -ArgumentList ('/select,"{0}"' -f $zipPath) }
