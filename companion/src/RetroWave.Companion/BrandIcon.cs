using System.Windows.Media.Imaging;

namespace RetroWave.Companion;

internal static class BrandIcon
{
    public static BitmapFrame Load(int pixels)
    {
        var decoder = BitmapDecoder.Create(new Uri("pack://application:,,,/RetroWave;component/Assets/RetroWave.ico"), BitmapCreateOptions.PreservePixelFormat, BitmapCacheOption.OnLoad);
        var frame = decoder.Frames.OrderBy(f => Math.Abs(f.PixelWidth - pixels)).First();
        if (frame.CanFreeze) frame.Freeze();
        return frame;
    }
}
