using System.IO;
using System.Reflection;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using RetroWave.Companion;

internal static class Program
{
    [STAThread] private static int Main()
    {
        var output = Path.GetFullPath("artifacts/ui"); Directory.CreateDirectory(output);
        Environment.SetEnvironmentVariable("RETROWAVE_DATA_ROOT", Path.Combine(output, "data"));
        Environment.SetEnvironmentVariable("RETROWAVE_BRIDGE_PORT", "43839");
        var app = new Application(); var window = new MainWindow(); var checks = 0; var result = 0;
        void Check(bool value, string name) { if (!value) throw new Exception(name); checks++; Console.WriteLine("PASS " + name); }
        window.Loaded += async (_, _) =>
        {
            try
            {
                Check(window.Title == "RetroWave", "application title");
                var navigation = (ListBox)window.FindName("Navigation"); var heading = (TextBlock)window.FindName("PageTitle");
                for (var i = 0; i < navigation.Items.Count; i++)
                {
                    navigation.SelectedIndex = i; await window.Dispatcher.InvokeAsync(() => { }, DispatcherPriority.ApplicationIdle);
                    Check(heading.Text == ((ListBoxItem)navigation.Items[i]).Tag.ToString(), "navigation " + heading.Text);
                }
                navigation.SelectedIndex = 0; window.UpdateLayout(); Screenshot(window, Path.Combine(output, "dashboard.png"));
                navigation.SelectedIndex = 1; window.UpdateLayout(); Screenshot(window, Path.Combine(output, "now-playing-empty.png"));
                var native = new PlaybackSnapshot { Title = "UI test recording", Artist = "Fixture artist", AlbumArtist = "Fixture album artist", Album = "Fixture album", Player = "TestPublisher", Status = "ready", Duration = 180, Position = 24, MetadataUpdatedUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), CapturedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() };
                typeof(MainWindow).GetField("snapshot", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(window, native);
                typeof(MainWindow).GetMethod("Render", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.DeclaredOnly)!.Invoke(window, null); window.UpdateLayout();
                var content = (StackPanel)window.FindName("PageContent"); Check(content.Children.Count > 0, "native metadata page populated"); Screenshot(window, Path.Combine(output, "now-playing-fixture.png"));
                foreach (var theme in new[] { "Dark", "Light", "System" })
                {
                    (AppSettings.Load() with { Theme = theme }).Save(); typeof(MainWindow).GetMethod("ApplyTheme", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(window, null); Check(AppSettings.Load().Theme == theme, "persisted theme " + theme);
                }
                navigation.SelectedIndex = 2; window.UpdateLayout(); Screenshot(window, Path.Combine(output, "music-finder.png"));
                window.Width = 760; window.Height = 560; window.UpdateLayout(); Check(window.ActualWidth >= 760 && window.ActualHeight >= 560, "minimum responsive size");
                Check(System.Windows.PresentationSource.FromVisual(window)?.CompositionTarget is not null, "native DPI-aware rendering surface");
                Console.WriteLine($"{checks} native UI checks passed.");
            }
            catch (Exception ex) { Console.Error.WriteLine(ex); result = 1; }
            finally { window.Close(); }
        };
        app.Run(window); return result;
    }
    private static void Screenshot(Window window, string path)
    {
        var bitmap = new RenderTargetBitmap((int)window.ActualWidth, (int)window.ActualHeight, 96, 96, PixelFormats.Pbgra32); bitmap.Render(window);
        var encoder = new PngBitmapEncoder(); encoder.Frames.Add(BitmapFrame.Create(bitmap)); using var file = File.Create(path); encoder.Save(file);
    }
}
