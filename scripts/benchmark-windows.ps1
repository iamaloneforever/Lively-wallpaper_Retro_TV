param([int]$SampleSeconds = 20)
$ErrorActionPreference = 'Stop'
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$output = Join-Path $repoPath 'artifacts/benchmark'; New-Item -ItemType Directory -Force $output | Out-Null
$data = Join-Path $output 'data'; New-Item -ItemType Directory -Force $data | Out-Null
$oldRoot = $env:SPICY_BOND_DATA_ROOT; $oldPort = $env:SPICY_BOND_BRIDGE_PORT
$env:SPICY_BOND_DATA_ROOT=$data; $env:SPICY_BOND_BRIDGE_PORT='43838'
$token=[Guid]::NewGuid().ToString('N')
@{library=$data;entry=$data;created=$true;original=$null;installedHash='';companion=$true;catalog=$false;bridgeToken=$token} | ConvertTo-Json | Set-Content (Join-Path $data 'installation.json')
@{installDirectory=$output;externalConsent=$false;startup=$false;providers=@()} | ConvertTo-Json | Set-Content (Join-Path $data 'settings.json')
$executable=Join-Path $output 'SpicyBond.exe'; Copy-Item (Join-Path $repoPath 'artifacts/SpicyBond-Setup.exe') $executable -Force
$baseline=Get-Process -Name SpicyBond.Companion -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq (Join-Path $env:LOCALAPPDATA 'Spicy Bond/SpicyBond.Companion.exe')} | Select-Object -First 1
$worker=$null
try {
    $clock=[Diagnostics.Stopwatch]::StartNew(); $worker=Start-Process $executable -ArgumentList '--run' -WindowStyle Hidden -PassThru
    for ($attempt=0;$attempt -lt 100;$attempt++) {try {$null=Invoke-RestMethod 'http://127.0.0.1:43838/now-playing' -Headers @{Origin='https://iamaloneforever.github.io';'X-RetroWave-Key'=$token} -TimeoutSec 1;break} catch {Start-Sleep -Milliseconds 50}}
    $clock.Stop(); if ($attempt -eq 100) {throw 'Startup timed out'}
    Start-Sleep -Seconds 15
    $worker.Refresh(); $newCpu=$worker.TotalProcessorTime.TotalSeconds
    if ($baseline) {$baseline.Refresh();$oldCpu=$baseline.TotalProcessorTime.TotalSeconds}
    Start-Sleep -Seconds $SampleSeconds
    $worker.Refresh(); if ($baseline) {$baseline.Refresh()}
    $oldWorker=Get-Item (Join-Path $repoPath 'artifacts/baseline/worker/SpicyBond.Companion.exe')
    $oldSetup=Get-Item (Join-Path $repoPath 'artifacts/baseline/setup/SpicyBond-Setup.exe')
    $newBinary=Get-Item $executable
    $result=[ordered]@{
        sampleSeconds=$SampleSeconds; oldInstallerBytes=$oldSetup.Length; oldInstalledBinaryBytes=($oldSetup.Length+$oldWorker.Length); newInstallerBytes=$newBinary.Length; newInstalledBinaryBytes=$newBinary.Length
        oldWorkerWorkingSetBytes=if ($baseline) {$baseline.WorkingSet64} else {$null}; newWorkerWorkingSetBytes=$worker.WorkingSet64
        oldCpuSeconds=if ($baseline) {$baseline.TotalProcessorTime.TotalSeconds-$oldCpu} else {$null}; newCpuSeconds=($worker.TotalProcessorTime.TotalSeconds-$newCpu)
        oldWorkerStartupMs=$null; newWorkerStartupMs=$clock.ElapsedMilliseconds; oldProcessVersion=if ($baseline) {[Diagnostics.FileVersionInfo]::GetVersionInfo($baseline.Path).FileVersion} else {$null}
        notes='Old worker is the already-running installed 3.0 process; it was not interrupted. Startup is process launch to authenticated bridge, sampled once with extraction state not controlled. Binary sizes exclude single-file extraction and user data. Matching disabled for new sample. CPU is total process CPU seconds, not a percentage.'
    }
    $result | ConvertTo-Json | Set-Content (Join-Path $output 'results.json'); $result | ConvertTo-Json
} finally {
    if ($worker -and -not $worker.HasExited) {$stop=Start-Process $executable -ArgumentList '--stop' -WindowStyle Hidden -PassThru;$stop.WaitForExit(15000) | Out-Null; $worker.WaitForExit(10000) | Out-Null}
    $env:SPICY_BOND_DATA_ROOT=$oldRoot;$env:SPICY_BOND_BRIDGE_PORT=$oldPort
}
