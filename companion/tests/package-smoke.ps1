param([string]$Runtime = 'win-x64')
$ErrorActionPreference = 'Stop'
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$verifyPath = [IO.Path]::GetFullPath((Join-Path $repoPath '.build/package-smoke'))
if (-not $verifyPath.StartsWith($repoPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Test directory escaped repository.' }
New-Item -ItemType Directory -Path $verifyPath -Force | Out-Null
$assemblyPath = Join-Path $repoPath "companion/src/RetroWave.Setup/bin/Release/net10.0-windows10.0.19041.0/$Runtime/RetroWave-Setup.dll"
$assembly = [Reflection.Assembly]::LoadFile($assemblyPath)
$stream = $assembly.GetManifestResourceStream('RetroWave.Companion.exe')
if (-not $stream) { throw 'Installer has no embedded companion.' }
$workerPath = Join-Path $verifyPath 'RetroWave.Companion.exe'
$output = [IO.File]::Create($workerPath)
try { $stream.CopyTo($output) } finally { $stream.Dispose(); $output.Dispose() }
$diagnosticPath = Join-Path $env:LOCALAPPDATA 'RetroWave TV/diagnostics.json'
$oldReport = if (Test-Path -LiteralPath $diagnosticPath) { [IO.File]::ReadAllBytes($diagnosticPath) } else { $null }
function Test-Window([string]$Executable, [string]$Arguments, [string]$Title) {
    $options = @{FilePath=$Executable;PassThru=$true}
    if ($Arguments) { $options.ArgumentList = $Arguments }
    $process = Start-Process @options
    try {
        for ($attempt=0; $attempt -lt 40; $attempt++) { $process.Refresh(); if ($process.MainWindowHandle -ne 0) { break }; Start-Sleep -Milliseconds 200 }
        if ($process.MainWindowTitle -notlike $Title) { throw 'Expected application window did not open.' }
        Start-Sleep -Seconds 3
    } finally {
        if (-not $process.HasExited) { $process.CloseMainWindow() | Out-Null }
        if (-not $process.WaitForExit(5000) -or $process.ExitCode -ne 0) { throw 'Application failed to close cleanly.' }
    }
}
try {
    $process = Start-Process -FilePath $workerPath -ArgumentList '--diagnose' -WindowStyle Hidden -PassThru
    if (-not $process.WaitForExit(15000) -or $process.ExitCode -ne 0) { throw 'Embedded worker diagnostic command failed.' }
    $report = Get-Content -LiteralPath $diagnosticPath -Raw | ConvertFrom-Json
    if ($report.PSObject.Properties.Name -contains 'title' -or $report.PSObject.Properties.Name -contains 'bridgeToken') { throw 'Diagnostics contain private metadata.' }
    Write-Output "PASS embedded worker report: $($report.bridge), $($report.sessions) native sessions, $($report.media)"
    Test-Window $workerPath '--debug' '*Companion debugger*'
    Write-Output 'PASS embedded self-contained companion debugger opens/closes'
    $archivePath = Join-Path $repoPath "artifacts/RetroWave-TV-$Runtime.zip"
    $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try { if ($archive.Entries.Count -ne 1 -or $archive.Entries[0].FullName -ne 'RetroWave-Setup.exe') { throw 'ZIP must contain only the installer.' } } finally { $archive.Dispose() }
    Expand-Archive -LiteralPath $archivePath -DestinationPath (Join-Path $verifyPath 'setup') -Force
    Test-Window (Join-Path $verifyPath 'setup/RetroWave-Setup.exe') '' '*RetroWave TV setup*'
    Write-Output 'PASS single-entry ZIP and actual self-contained installer window'
} finally {
    if ($null -ne $oldReport) { [IO.File]::WriteAllBytes($diagnosticPath,$oldReport) } else { Remove-Item -LiteralPath $diagnosticPath -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $verifyPath) { Remove-Item -LiteralPath $verifyPath -Recurse -Force -ErrorAction Continue }
}
