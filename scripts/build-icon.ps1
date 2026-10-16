$ErrorActionPreference = 'Stop'
$brand = Get-Content (Join-Path $PSScriptRoot '../branding.json') -Raw | ConvertFrom-Json
Add-Type -AssemblyName System.Drawing
$assetPath = Join-Path $PSScriptRoot '../companion/src/SpicyBond.Companion/Assets/SpicyBond.ico'
$sizes = @(16,24,32,48,64,128,256)
$images = foreach ($size in $sizes) {
    $bitmap = [Drawing.Bitmap]::new($size,$size)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform($size / 256.0,$size / 256.0)
    $graphics.ScaleTransform(2,2)
    $purple = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($brand.colors.purple))
    $yellow = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($brand.colors.yellow))
    $graphics.FillEllipse($purple,2,2,124,124)
    $graphics.FillEllipse($yellow,20,52,56,56)
    $graphics.FillEllipse($yellow,52,20,56,56)
    $graphics.FillEllipse($purple,36,68,24,24)
    $graphics.FillEllipse($purple,68,36,24,24)
    $buffer = [IO.MemoryStream]::new(); $bitmap.Save($buffer,[Drawing.Imaging.ImageFormat]::Png)
    ,$buffer.ToArray()
    $buffer.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $purple.Dispose(); $yellow.Dispose()
}
$file = [IO.File]::Create([IO.Path]::GetFullPath($assetPath)); $writer = [IO.BinaryWriter]::new($file)
try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count); $offset = 6 + 16*$sizes.Count
    for ($i=0;$i -lt $sizes.Count;$i++) {
        $dimension = if ($sizes[$i] -eq 256) {0} else {$sizes[$i]}
        $writer.Write([byte]$dimension); $writer.Write([byte]$dimension); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$images[$i].Length); $writer.Write([uint32]$offset); $offset += $images[$i].Length
    }
    foreach ($bytes in $images) {$writer.Write([byte[]]$bytes)}
} finally {$writer.Dispose(); $file.Dispose()}
