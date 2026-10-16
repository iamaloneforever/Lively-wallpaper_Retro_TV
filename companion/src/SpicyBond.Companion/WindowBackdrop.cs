using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
namespace SpicyBond.Companion;
internal static class WindowBackdrop
{
    [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int size);
    public static void Apply(Window window)
    {
        if (!OperatingSystem.IsWindowsVersionAtLeast(10, 0, 22621)) return;
        using var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
        var mica = SystemParameters.HighContrast || key?.GetValue("EnableTransparency") is int transparency && transparency == 0 ? 1 : 2;
        DwmSetWindowAttribute(new WindowInteropHelper(window).Handle, 38, ref mica, sizeof(int));
    }
}
