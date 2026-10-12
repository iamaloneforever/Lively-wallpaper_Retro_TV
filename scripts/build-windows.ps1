param([string]$Runtime = 'win-x64', [string]$DotNet = 'dotnet')
$ErrorActionPreference = 'Stop'
if ($Runtime -notin @('win-x64', 'win-arm64')) { throw 'Use win-x64 or win-arm64.' }
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$buildPath = [IO.Path]::GetFullPath((Join-Path $repoPath ".build/windows-$Runtime"))
if (-not $buildPath.StartsWith($repoPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Build path escaped repository.' }
Push-Location $repoPath
try {
    $workerPath = Join-Path $buildPath 'worker'
    $setupPath = Join-Path $buildPath 'setup'
    & $DotNet publish companion/src/RetroWave.Companion/RetroWave.Companion.csproj -c Release -r $Runtime --self-contained true -o $workerPath -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -p:DebugType=None -p:DebugSymbols=false
    if ($LASTEXITCODE -ne 0) { throw 'Companion publish failed.' }
    $payload = Join-Path $workerPath 'RetroWave.Companion.exe'
    & $DotNet publish companion/src/RetroWave.Setup/RetroWave.Setup.csproj -c Release -r $Runtime --self-contained true -o $setupPath -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -p:DebugType=None -p:DebugSymbols=false "-p:CompanionPayload=$payload"
    if ($LASTEXITCODE -ne 0) { throw 'Installer publish failed.' }
    $artifactsPath = Join-Path $repoPath 'artifacts'
    New-Item -ItemType Directory -Path $artifactsPath -Force | Out-Null
    $archivePath = Join-Path $artifactsPath "RetroWave-TV-$Runtime.zip"
    Compress-Archive -LiteralPath (Join-Path $setupPath 'RetroWave-Setup.exe') -DestinationPath $archivePath -Force
    $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        if ($archive.Entries.Count -ne 1 -or $archive.Entries[0].FullName -ne 'RetroWave-Setup.exe') { throw 'Release ZIP must contain only the installer.' }
    } finally { $archive.Dispose() }
    Write-Output "Built $archivePath (one installer, embedded self-contained companion)"
} finally {
    Pop-Location
    if (Test-Path -LiteralPath $buildPath) { Remove-Item -LiteralPath $buildPath -Recurse -Force }
}
