$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetPath = Join-Path $PSScriptRoot '../companion/src/RetroWave.Companion/Assets/RetroWave.ico'
$sizes = @(16,24,32,48,64,128,256)
$images = foreach ($size in $sizes) {
    $bitmap = [Drawing.Bitmap]::new($size,$size)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform($size / 256.0,$size / 256.0)
    $dark = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#18334b'))
    $screen = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#10273b'))
    $accent = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#43c5cf'))
    function Rounded($x,$y,$w,$h,$r) {
        $path = [Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddArc($x,$y,$r,$r,180,90); $path.AddArc(($x+$w-$r),$y,$r,$r,270,90)
        $path.AddArc(($x+$w-$r),($y+$h-$r),$r,$r,0,90); $path.AddArc($x,($y+$h-$r),$r,$r,90,90); $path.CloseFigure(); return $path
    }
    $outer = Rounded 16 36 224 188 80; $inner = Rounded 34 54 188 136 52; $glass = Rounded 46 66 164 112 38
    $graphics.FillPath($dark,$outer); $graphics.FillPath($accent,$inner); $graphics.FillPath($screen,$glass)
    $pen = [Drawing.Pen]::new($accent,12); $pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round; $pen.StartCap = $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
    $points = [Drawing.PointF[]]@([Drawing.PointF]::new(65,126),[Drawing.PointF]::new(89,126),[Drawing.PointF]::new(102,96),[Drawing.PointF]::new(123,156),[Drawing.PointF]::new(143,88),[Drawing.PointF]::new(160,126),[Drawing.PointF]::new(191,126))
    $graphics.DrawLines($pen,$points); $graphics.FillEllipse($accent,185,199,14,14)
    $pen.Color = $dark.Color; $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(89,20),[Drawing.PointF]::new(128,43),[Drawing.PointF]::new(167,20)))
    $buffer = [IO.MemoryStream]::new(); $bitmap.Save($buffer,[Drawing.Imaging.ImageFormat]::Png)
    ,$buffer.ToArray()
    $buffer.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $dark.Dispose(); $screen.Dispose(); $accent.Dispose(); $pen.Dispose(); $outer.Dispose(); $inner.Dispose(); $glass.Dispose()
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
