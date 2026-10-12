using RetroWave.Companion;
namespace RetroWave.Setup;
internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            if (args.Contains("--install")) { WindowsSetup.Install(!args.Contains("--no-companion"), args.Contains("--catalog")); return 0; }
            if (args.Contains("--uninstall"))
            {
                var message = WindowsSetup.Uninstall();
                if (!args.Contains("--quiet")) MessageBox.Show(message, "RetroWave TV setup");
                return 0;
            }
            ApplicationConfiguration.Initialize(); Application.Run(new SetupForm()); return 0;
        }
        catch (Exception ex)
        {
            DiagnosticLog.Error("setup", ex);
            if (!args.Contains("--quiet")) MessageBox.Show(ex.Message, "RetroWave TV setup");
            return 1;
        }
    }
}
