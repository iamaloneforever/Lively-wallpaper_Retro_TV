param([string]$Runtime = 'win-x64', [string]$DotNet = 'dotnet', [switch]$Offline)
$ErrorActionPreference = 'Stop'
if ($Runtime -notin @('win-x64', 'win-arm64')) { throw 'Use win-x64 or win-arm64.' }
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$buildPath = [IO.Path]::GetFullPath((Join-Path $repoPath ".build/windows-$Runtime"))
if (-not $buildPath.StartsWith($repoPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Build path escaped repository.' }
Push-Location $repoPath
try {
    $workerPath = Join-Path $buildPath 'worker'
    $restoreOptions = if ($Offline) { @('-p:NuGetAudit=false', '--ignore-failed-sources') } else { @() }
    $project = 'companion/src/RetroWave.Companion/RetroWave.Companion.csproj'
    New-Item -ItemType Directory -Path $buildPath -Force | Out-Null
    & $DotNet restore $project -r $Runtime -p:EnableWindowsTargeting=true @restoreOptions
    if ($LASTEXITCODE -ne 0) { throw 'Companion restore failed.' }
    $resolvedPath = Join-Path $buildPath 'resolved.json'
    & $DotNet msbuild $project -p:EnableWindowsTargeting=true -p:RuntimeIdentifier=$Runtime -p:SelfContained=true -t:ResolveReferences -getItem:RuntimePackAsset,ReferenceCopyLocalPaths -getProperty:NuGetPackageRoot,NETCoreSdkVersion | Set-Content -LiteralPath $resolvedPath -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw 'Runtime inventory resolution failed.' }
    & node scripts/windows-licenses.mjs $resolvedPath (Join-Path $buildPath 'licenses')
    if ($LASTEXITCODE -ne 0) { throw 'Windows license collection failed.' }
    $licenseBundle = Join-Path $buildPath 'licenses.zip'
    & $DotNet publish $project -c Release -r $Runtime --self-contained true --no-restore -o $workerPath -p:EnableWindowsTargeting=true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -p:DebugType=None -p:DebugSymbols=false -p:RequireLicenseBundle=true "-p:LicenseBundlePath=$licenseBundle"
    if ($LASTEXITCODE -ne 0) { throw 'Companion publish failed.' }
    $artifactsPath = Join-Path $repoPath 'artifacts'
    New-Item -ItemType Directory -Path $artifactsPath -Force | Out-Null
    $installer = Join-Path $artifactsPath 'RetroWave-Setup.exe'
    Copy-Item -LiteralPath (Join-Path $workerPath 'RetroWave.exe') -Destination $installer -Force
    $archivePath = Join-Path $artifactsPath "RetroWave-TV-$Runtime.zip"
    Compress-Archive -LiteralPath $installer -DestinationPath $archivePath -Force
    Copy-Item -LiteralPath $licenseBundle -Destination (Join-Path $artifactsPath 'RetroWave-licenses.zip') -Force
    $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        if ($archive.Entries.Count -ne 1 -or $archive.Entries[0].FullName -ne 'RetroWave-Setup.exe') { throw 'Release ZIP must contain only the installer.' }
    } finally { $archive.Dispose() }
    & $DotNet run --project companion/tests/RetroWave.PackageAudit -c Release -- $archivePath $licenseBundle
    if ($LASTEXITCODE -ne 0) { throw 'Actual Windows release artifact failed its license and binary checks.' }
    Write-Output "Built $archivePath (one self-contained application with setup and headless worker modes)"
} finally {
    Pop-Location
    if (Test-Path -LiteralPath $buildPath) { Remove-Item -LiteralPath $buildPath -Recurse -Force }
}
