param([string]$ResourceCompiler)
$ErrorActionPreference='Stop'
$repoPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$assets=Join-Path $repoPath 'companion/src/RetroWave.Companion/Assets'
if (-not $ResourceCompiler) {
    $roots=@((Join-Path ${env:ProgramFiles(x86)} 'Windows Kits/10/bin'),(Join-Path $env:USERPROFILE '.nuget/packages/microsoft.windows.sdk.buildtools'))
    $ResourceCompiler=$roots | Where-Object {Test-Path -LiteralPath $_} | ForEach-Object {Get-ChildItem -LiteralPath $_ -Filter rc.exe -Recurse -File} | Where-Object {$_.FullName -match '[\\/]x64[\\/]rc.exe$'} | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ResourceCompiler) {throw 'Windows SDK resource compiler is needed only to regenerate the checked-in branding resource.'}
$project=[xml](Get-Content (Join-Path $repoPath 'companion/src/RetroWave.Companion/RetroWave.Companion.csproj') -Raw)
$version=$project.Project.PropertyGroup.Version; $numeric=$version.Replace('.',',')+',0'
$rc=@"
#pragma code_page(65001)
101 ICON "RetroWave.ico"
1 24 "RetroWave.manifest"
1 VERSIONINFO
FILEVERSION $numeric
PRODUCTVERSION $numeric
FILEFLAGSMASK 0x3fL
FILEFLAGS 0
FILEOS 0x40004L
FILETYPE 1
FILESUBTYPE 0
BEGIN
 BLOCK "StringFileInfo"
 BEGIN
  BLOCK "040904b0"
  BEGIN
   VALUE "CompanyName", "RetroWave TV contributors\0"
   VALUE "FileDescription", "RetroWave — Music Companion for Lively Wallpaper\0"
   VALUE "FileVersion", "$version.0\0"
   VALUE "InternalName", "RetroWave\0"
   VALUE "LegalCopyright", "Copyright © 2026 RetroWave TV contributors\0"
   VALUE "OriginalFilename", "RetroWave.exe\0"
   VALUE "ProductName", "RetroWave TV\0"
   VALUE "ProductVersion", "$version\0"
  END
 END
 BLOCK "VarFileInfo"
 BEGIN
  VALUE "Translation", 0x409, 1200
 END
END
"@
Set-Content -LiteralPath (Join-Path $assets 'RetroWave.rc') -Value $rc -Encoding utf8
Push-Location $assets
try {& $ResourceCompiler /nologo /fo RetroWave.res RetroWave.rc; if ($LASTEXITCODE -ne 0) {throw 'Branding resource compilation failed'}} finally {Pop-Location}
