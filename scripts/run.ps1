# Activate RetroWave TV after importing its package into Lively.
[CmdletBinding()]
param([int]$Monitor = -1)
$ErrorActionPreference = 'Stop'
$paths = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\Lively Wallpaper\lively.exe'),
  (Join-Path $env:ProgramFiles 'Lively Wallpaper\lively.exe')
)
if (${env:ProgramFiles(x86)}) { $paths += (Join-Path ${env:ProgramFiles(x86)} 'Lively Wallpaper\lively.exe') }
$paths = @($paths | Where-Object { $_ -and (Test-Path $_) })
$cli = Get-Command 'livelycu.exe' -ErrorAction SilentlyContinue
if ($cli) { $exe = $cli.Source }
elseif ($paths.Count -gt 0) { $exe = $paths[0] }
else { throw 'Lively executable not found. Start Lively manually or add livelycu.exe to PATH.' }
$folders = @(
  (Join-Path $env:LOCALAPPDATA 'Lively Wallpaper\Library\wallpapers'),
  (Join-Path $env:APPDATA 'Lively Wallpaper\Library\wallpapers')
)
$match = $null
foreach ($base in $folders) {
  if (!(Test-Path $base)) { continue }
  foreach ($file in (Get-ChildItem -Path $base -Filter 'LivelyInfo.json' -File -Recurse -ErrorAction SilentlyContinue)) {
    try {
      $info = Get-Content -Raw $file.FullName | ConvertFrom-Json
      if ($info.FileName -match 'iamaloneforever\.github\.io/Lively-wallpaper_Retro_TV') {
        $match = $file.DirectoryName
        break
      }
    } catch { }
  }
  if ($match) { break }
}
if (!$match) { throw 'RetroWave TV not found in Lively library. Import the ZIP first.' }
$argsList = @('setwp', '--file', $match)
if ($Monitor -ge 0) { $argsList += @('--monitor', "$Monitor") }
Start-Process -FilePath $exe -ArgumentList $argsList -Wait -NoNewWindow
Write-Host "Requested wallpaper activation: $match" -ForegroundColor Green
