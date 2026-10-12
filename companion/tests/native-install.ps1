param([Parameter(Mandatory)][string]$Library)
$ErrorActionPreference = 'Stop'
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$installPath = Join-Path $env:LOCALAPPDATA 'RetroWave TV'
if (Test-Path -LiteralPath (Join-Path $installPath 'installation.json')) { throw 'Uninstall an existing RetroWave installation before this disposable native integration test.' }
$testPath = [IO.Path]::GetFullPath((Join-Path $repoPath '.build/native-test'))
if (-not $testPath.StartsWith($repoPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Test path escaped repository.' }
function Invoke-Executable([string]$Path, [string[]]$Arguments) {
    $process = Start-Process -FilePath $Path -ArgumentList $Arguments -WindowStyle Hidden -PassThru
    if (-not $process.WaitForExit(30000)) { throw 'Native command timed out.' }
    if ($process.ExitCode -ne 0) { throw "Native command failed: $($process.ExitCode). Check companion.log." }
}
$before = @{}
Get-ChildItem -LiteralPath (Join-Path $Library 'wallpapers') -Filter LivelyInfo.json -Recurse | ForEach-Object { $before[$_.FullName] = (Get-FileHash -LiteralPath $_.FullName).Hash }
$debugger = $null
try {
    Expand-Archive -LiteralPath (Join-Path $repoPath 'artifacts/RetroWave-TV-win-x64.zip') -DestinationPath $testPath -Force
    $setup = Join-Path $testPath 'RetroWave-Setup.exe'
    Invoke-Executable $setup @('--install','--quiet')
    $state = Get-Content -LiteralPath (Join-Path $installPath 'installation.json') -Raw | ConvertFrom-Json
    if ($state.catalog) { throw 'Public metadata matching unexpectedly enabled.' }
    $worker = Join-Path $installPath 'RetroWave.Companion.exe'
    if (-not (Test-Path -LiteralPath $worker)) { throw 'Embedded companion not extracted.' }
    if ((Get-FileHash -LiteralPath $worker).Hash -eq (Get-FileHash -LiteralPath $setup).Hash) { throw 'Installer and companion must be distinct executables.' }
    Invoke-Executable $setup @('--install','--quiet')
    $repaired = Get-Content -LiteralPath (Join-Path $installPath 'installation.json') -Raw | ConvertFrom-Json
    if ($state.entry -ne $repaired.entry -or $state.bridgeToken -ne $repaired.bridgeToken) { throw 'Repair changed wallpaper or pairing.' }
    Invoke-Executable $worker @('--diagnose')
    $report = Get-Content -LiteralPath (Join-Path $installPath 'diagnostics.json') -Raw | ConvertFrom-Json
    if ($report.bridge -ne 'Connected (authenticated)' -or $report.sessions -lt 1 -or $report.snapshotAgeMs -gt 3500) { throw 'Native bridge / media diagnostics failed.' }
    if ($report.PSObject.Properties.Name -contains 'title' -or $report.PSObject.Properties.Name -contains 'bridgeToken') { throw 'Report leaked metadata or token.' }
    Write-Output 'PASS separate installed worker, idempotent setup and authenticated native clock report'
    $debugger = Start-Process -FilePath $worker -ArgumentList '--debug' -PassThru
    for ($attempt=0; $attempt -lt 30; $attempt++) { $debugger.Refresh(); if ($debugger.MainWindowHandle -ne 0) { break }; Start-Sleep -Milliseconds 200 }
    if ($debugger.MainWindowTitle -notlike '*Companion debugger*') { throw 'Debugger window did not open.' }
    $debugger.CloseMainWindow() | Out-Null
    if (-not $debugger.WaitForExit(5000)) { throw 'Debugger did not close.' }
    if ($debugger.ExitCode -ne 0) { throw 'Debugger crashed.' }
    Invoke-Executable $worker @('--diagnose')
    $report = Get-Content -LiteralPath (Join-Path $installPath 'diagnostics.json') -Raw | ConvertFrom-Json
    if ($report.bridge -ne 'Connected (authenticated)') { throw 'Closing debugger stopped worker.' }
    Write-Output 'PASS debugger window opens/closes independently of the background worker'
    Invoke-Executable $worker @('--stop')
    Invoke-Executable $worker @('--diagnose')
    $report = Get-Content -LiteralPath (Join-Path $installPath 'diagnostics.json') -Raw | ConvertFrom-Json
    if ($report.bridge -like 'Connected*') { throw 'Stop did not disconnect bridge.' }
    Start-Process -FilePath $worker -ArgumentList '--run' -WindowStyle Hidden | Out-Null
    Invoke-Executable $worker @('--diagnose')
    $report = Get-Content -LiteralPath (Join-Path $installPath 'diagnostics.json') -Raw | ConvertFrom-Json
    if ($report.bridge -ne 'Connected (authenticated)') { throw 'Restart did not reconnect bridge.' }
    Write-Output 'PASS companion stop/restart reflected by debugger reports'
    if (-not (Test-Path -LiteralPath (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs/RetroWave TV Debugger.lnk'))) { throw 'Missing debugger shortcut.' }
}
finally {
    if ($debugger -and -not $debugger.HasExited) { $debugger.CloseMainWindow() | Out-Null; $debugger.WaitForExit(5000) | Out-Null }
    if (Test-Path -LiteralPath (Join-Path $installPath 'installation.json')) { Invoke-Executable (Join-Path $testPath 'RetroWave-Setup.exe') @('--uninstall','--quiet') }
    for ($attempt=0; $attempt -lt 40 -and (Test-Path -LiteralPath (Join-Path $installPath 'RetroWave.Companion.exe')); $attempt++) { Start-Sleep -Milliseconds 250 }
    foreach ($path in $before.Keys) { if (-not (Test-Path -LiteralPath $path) -or (Get-FileHash -LiteralPath $path).Hash -ne $before[$path]) { throw 'Uninstall changed pre-existing Lively metadata.' } }
    if (Test-Path -LiteralPath $testPath) { Remove-Item -LiteralPath $testPath -Recurse -Force }
}
if ((Test-Path -LiteralPath (Join-Path $installPath 'RetroWave.Companion.exe')) -or (Test-Path -LiteralPath (Join-Path $installPath 'RetroWave-Setup.exe'))) { throw 'Uninstall did not remove installed executables.' }
if (Test-Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\RetroWaveTV') { throw 'Uninstall registry entry remains.' }
if (Get-ItemPropertyValue 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name RetroWaveTV -ErrorAction SilentlyContinue) { throw 'Startup entry remains.' }
Write-Output 'PASS uninstall restores existing wallpaper metadata and removes owned installation'
