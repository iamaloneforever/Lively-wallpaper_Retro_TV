param([string]$Runtime = 'win-x64')
$ErrorActionPreference = 'Stop'
if (-not ('RetroWaveTestWindows' -as [type])) {
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class RetroWaveTestWindows {
  delegate bool Callback(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(Callback cb,IntPtr p);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
  public static IntPtr Find(int pid,string title) {
    IntPtr result=IntPtr.Zero;
    EnumWindows((h,p)=>{uint owner;GetWindowThreadProcessId(h,out owner);var text=new StringBuilder(512);GetWindowText(h,text,512);if(owner==pid && text.ToString()==title){result=h;return false;}return true;},IntPtr.Zero);
    return result;
  }
}
'@
}
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$verifyPath = [IO.Path]::GetFullPath((Join-Path $repoPath '.build/package-smoke'))
if (-not $verifyPath.StartsWith($repoPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Test directory escaped repository.' }
New-Item -ItemType Directory -Path $verifyPath -Force | Out-Null
$oldData = $env:RETROWAVE_DATA_ROOT; $oldPort = $env:RETROWAVE_BRIDGE_PORT
$env:RETROWAVE_DATA_ROOT = Join-Path $verifyPath 'data'; $env:RETROWAVE_BRIDGE_PORT = '43839'
New-Item -ItemType Directory -Path $env:RETROWAVE_DATA_ROOT -Force | Out-Null
$workerPath = Join-Path $verifyPath 'RetroWave.exe'
Copy-Item -LiteralPath (Join-Path $repoPath 'artifacts/RetroWave-Setup.exe') -Destination $workerPath -Force
$version=[Diagnostics.FileVersionInfo]::GetVersionInfo($workerPath)
if ($version.ProductName -ne 'RetroWave TV' -or $version.FileDescription -ne 'RetroWave — Music Companion for Lively Wallpaper' -or $version.OriginalFilename -ne 'RetroWave.exe' -or $version.InternalName -ne 'RetroWave' -or $version.FileVersion -ne '4.0.0.0') {throw 'Executable branding resources are invalid'}
Write-Output 'PASS actual executable Windows branding and version resources'
$token = [Guid]::NewGuid().ToString('N')
@{library=$verifyPath; entry=$verifyPath; created=$true; original=$null; installedHash=''; companion=$true; catalog=$false; bridgeToken=$token} | ConvertTo-Json | Set-Content (Join-Path $env:RETROWAVE_DATA_ROOT 'installation.json')
@{installDirectory=$verifyPath; externalConsent=$false; startup=$false; theme='System'; providers=@()} | ConvertTo-Json | Set-Content (Join-Path $env:RETROWAVE_DATA_ROOT 'settings.json')
function Command([string]$Arguments) {
    $process = Start-Process -FilePath $workerPath -ArgumentList $Arguments -WindowStyle Hidden -PassThru
    if (-not $process.WaitForExit(15000) -or $process.ExitCode -ne 0) { throw "Command failed: $Arguments" }
}
function Bridge { Invoke-RestMethod -Uri 'http://127.0.0.1:43839/now-playing' -Headers @{Origin='https://iamaloneforever.github.io'; 'X-RetroWave-Key'=$token} -TimeoutSec 2 }
function Window([string]$Path,[string]$Arguments,[string]$Title) {
    $options = @{FilePath=$Path; WindowStyle='Hidden'; PassThru=$true}; if ($Arguments) {$options.ArgumentList=$Arguments}
    $process = Start-Process @options
    try {
        $handle=[IntPtr]::Zero
        for ($attempt=0;$attempt -lt 60;$attempt++) {$process.Refresh();$handle=[RetroWaveTestWindows]::Find($process.Id,$Title); if ($handle -ne [IntPtr]::Zero) {break}; if ($process.HasExited) {throw 'Application exited before opening'}; Start-Sleep -Milliseconds 100}
        if ($handle -eq [IntPtr]::Zero) {throw "Expected $Title window; actual title: $($process.MainWindowTitle)"}
        [RetroWaveTestWindows]::PostMessage($handle,0x10,[IntPtr]::Zero,[IntPtr]::Zero) | Out-Null
        if (-not $process.WaitForExit(10000) -or $process.ExitCode -ne 0) {throw 'Window did not close cleanly'}
    } finally {if (-not $process.HasExited) {if ($handle -ne [IntPtr]::Zero) {[RetroWaveTestWindows]::PostMessage($handle,0x10,[IntPtr]::Zero,[IntPtr]::Zero) | Out-Null}; if (-not $process.WaitForExit(5000)) {$process.Kill()}}}
}
$worker = $null
try {
    $licensesPath = Join-Path $verifyPath 'licenses'
    Command "--licenses --licenses-dir `"$licensesPath`" --quiet"
    $manifest = Get-Content (Join-Path $licensesPath 'manifest.json') -Raw | ConvertFrom-Json
    foreach ($file in $manifest) {
        $path = Join-Path $licensesPath $file.file
        if (-not (Test-Path -LiteralPath $path) -or (Get-Item -LiteralPath $path).Length -ne $file.size -or (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw "Incomplete embedded license: $($file.file)" }
    }
    if ([IO.File]::ReadAllText((Join-Path $licensesPath 'RetroWave-MIT.txt')) -cne [IO.File]::ReadAllText((Join-Path $repoPath 'LICENSE-MIT'))) { throw 'Shipped companion MIT text is incomplete' }
    foreach ($name in @('index.html', 'DOTNET-LIBRARY-LICENSE.txt', 'WINDOWS-SDK-LICENSE.txt', 'WPF-THIRD-PARTY-NOTICES.txt', 'CsWinRT-MIT.txt')) { if (-not (Test-Path -LiteralPath (Join-Path $licensesPath $name))) { throw "Missing Windows material: $name" } }
    Write-Output 'PASS shipped executable extracts complete embedded licenses without installation'
    $worker = Start-Process -FilePath $workerPath -ArgumentList '--run' -WindowStyle Hidden -PassThru
    $connected = $false
    for ($attempt=0;$attempt -lt 50;$attempt++) {try {$null=Bridge; $connected=$true;break} catch {Start-Sleep -Milliseconds 100}}
    if (-not $connected) {throw 'Self-contained worker bridge did not start'}
    Write-Output 'PASS actual self-contained worker and authenticated bridge'
    Command '--run'; if ($worker.HasExited) {throw 'Duplicate launch disrupted worker'}
    Write-Output 'PASS duplicate worker exits without disrupting original'
    Window $workerPath '' 'RetroWave'; $null=Bridge
    Write-Output 'PASS UI opens/closes and worker remains connected'
    Command '--diagnose'
    $report = Get-Content (Join-Path $env:RETROWAVE_DATA_ROOT 'diagnostics.json') -Raw | ConvertFrom-Json
    if ($report.bridge -ne 'Connected (authenticated)' -or $report.PSObject.Properties.Name -contains 'title' -or $report.PSObject.Properties.Name -contains 'bridgeToken') {throw 'Invalid or private report'}
    Write-Output 'PASS sanitized diagnostics from shipped executable'
    Command '--stop'; if (-not $worker.WaitForExit(10000)) {throw 'Worker failed to stop'}
    $archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $repoPath "artifacts/RetroWave-TV-$Runtime.zip"))
    try {if ($archive.Entries.Count -ne 1 -or $archive.Entries[0].FullName -ne 'RetroWave-Setup.exe') {throw 'Release ZIP layout is invalid'}} finally {$archive.Dispose()}
    Window (Join-Path $repoPath 'artifacts/RetroWave-Setup.exe') '' 'RetroWave setup'
    Write-Output 'PASS single-installer ZIP and actual setup wizard'
} finally {
    if ($worker -and -not $worker.HasExited) {Command '--stop'; $worker.WaitForExit(10000) | Out-Null}
    $env:RETROWAVE_DATA_ROOT=$oldData; $env:RETROWAVE_BRIDGE_PORT=$oldPort
    if (Test-Path -LiteralPath $verifyPath) {Remove-Item -LiteralPath $verifyPath -Recurse -Force}
}
