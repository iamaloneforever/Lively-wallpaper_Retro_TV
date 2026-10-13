$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetPath = Join-Path $PSScriptRoot '../companion/src/RetroWave.Companion/Assets/RetroWave.ico'
$sizes = @(16,24,32,48,64,128,256)
$images = foreach ($size in $sizes) {
    $bitmap = [Drawing.Bitmap]::new($size,$size)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform($size / 256.0,$size / 256.0)
    function Rounded($x,$y,$w,$h,$r) {
        $path = [Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddArc($x,$y,$r,$r,180,90); $path.AddArc(($x+$w-$r),$y,$r,$r,270,90)
        $path.AddArc(($x+$w-$r),($y+$h-$r),$r,$r,0,90); $path.AddArc($x,($y+$h-$r),$r,$r,90,90); $path.CloseFigure(); return $path
    }
    $tile = Rounded 24 24 208 208 96
    $gradient = [Drawing.Drawing2D.LinearGradientBrush]::new([Drawing.Rectangle]::new(24,24,208,208),[Drawing.ColorTranslator]::FromHtml('#ffb15c'),[Drawing.ColorTranslator]::FromHtml('#d74737'),45.0)
    $white = [Drawing.SolidBrush]::new([Drawing.Color]::White)
    $soft = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(184,255,255,255))
    $play = [Drawing.Drawing2D.GraphicsPath]::new()
    $play.AddBezier(106,76,100,72,96,74,96,84); $play.AddLine(96,84,96,172)
    $play.AddBezier(96,172,96,184,102,182,108,178); $play.AddLine(108,178,180,136)
    $play.AddBezier(180,136,190,130,190,126,180,120); $play.CloseFigure()
    $bar = Rounded 68 96 10 64 10
    $graphics.FillPath($gradient,$tile); $graphics.FillPath($white,$play); $graphics.FillPath($soft,$bar)
    $buffer = [IO.MemoryStream]::new(); $bitmap.Save($buffer,[Drawing.Imaging.ImageFormat]::Png)
    ,$buffer.ToArray()
    $buffer.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $gradient.Dispose(); $white.Dispose(); $soft.Dispose(); $tile.Dispose(); $play.Dispose(); $bar.Dispose()
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
