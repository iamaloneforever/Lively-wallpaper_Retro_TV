using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
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
                    if (heading.Text == "About") Check(Descendants<Button>(window).Any(button => button.Content?.ToString() == "Licenses" && button.IsTabStop && button.Focusable), "About exposes keyboard-accessible embedded licenses");
                }
                navigation.SelectedIndex = 0; window.UpdateLayout(); Screenshot(window, Path.Combine(output, "dashboard.png"));
                var action = Descendants<Button>(window).First();
                Check(Descendants<Border>(action).Any(b => b.CornerRadius.TopLeft > 0), "native Fluent rounded button template");
                Check(action.IsTabStop && action.Focusable, "Fluent buttons retain keyboard access");
                Check(((BitmapSource)((Image)window.FindName("BrandMark")).Source).PixelWidth == 48, "sharp logo frame at display size");
                navigation.SelectedIndex = 1; window.UpdateLayout(); Screenshot(window, Path.Combine(output, "now-playing-empty.png"));
                var native = new PlaybackSnapshot { Title = "UI test recording", Artist = "Fixture artist", AlbumArtist = "Fixture album artist", Album = "Fixture album", Player = "TestPublisher", Status = "ready", Duration = 180, Position = 24, MetadataUpdatedUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), CapturedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() };
                typeof(MainWindow).GetField("snapshot", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(window, native);
                typeof(MainWindow).GetMethod("Render", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.DeclaredOnly)!.Invoke(window, null); window.UpdateLayout();
                var content = (StackPanel)window.FindName("PageContent"); Check(content.Children.Count > 0, "native metadata page populated"); Screenshot(window, Path.Combine(output, "now-playing-fixture.png"));
                foreach (var theme in new[] { "Dark", "Light", "System" })
                {
                    (AppSettings.Load() with { Theme = theme }).Save(); typeof(MainWindow).GetMethod("ApplyTheme", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(window, null); Check(AppSettings.Load().Theme == theme, "persisted theme " + theme);
                    window.UpdateLayout();
                    Check(window.TryFindResource("ButtonBackground") is Brush && window.TryFindResource("ButtonForeground") is Brush, "Fluent colour resources " + theme);
                    if (theme is "Light" or "Dark") { navigation.SelectedIndex = 0; window.UpdateLayout(); Screenshot(window, Path.Combine(output, "dashboard-" + theme.ToLowerInvariant() + ".png")); }
                }
                var setup = (Window)Activator.CreateInstance(typeof(MainWindow).Assembly.GetType("RetroWave.Setup.SetupWindow")!)!;
                setup.Show(); setup.UpdateLayout(); Check(setup.Title == "RetroWave setup" && Descendants<CheckBox>(setup).Count() == 7, "native Fluent setup preserves installation choices");
                Check(Descendants<Button>(setup).Any(button => button.Content?.ToString() == "Licenses" && button.IsTabStop && button.Focusable), "setup exposes licenses before installation");
                var setupChoices = Descendants<CheckBox>(setup).ToArray();
                Check(setupChoices[0].IsChecked == true, "new installation defaults companion on");
                Check(((TextBlock)setupChoices[2].Content).Text.Contains("enabled catalogue services"), "catalogue consent names metadata-sharing scope");
                Screenshot(setup, Path.Combine(output, "setup.png")); setup.Close();
                foreach (var enabled in new[] { false, true })
                {
                    var data = CompanionRuntime.Root;
                    var installed = new InstallationState(data, data, true, null, "", enabled, false, new string('a', 64));
                    File.WriteAllText(Path.Combine(data, "installation.json"), System.Text.Json.JsonSerializer.Serialize(installed, PlaybackSnapshot.Json));
                    var repair = (Window)Activator.CreateInstance(typeof(MainWindow).Assembly.GetType("RetroWave.Setup.SetupWindow")!)!;
                    try
                    {
                        repair.Show(); repair.UpdateLayout(); var choices = Descendants<CheckBox>(repair).ToArray();
                        Check(choices[0].IsChecked == enabled, "repair preserves companion " + enabled);
                        Check(choices[2].IsEnabled == enabled, "catalogue control follows companion " + enabled);
                    }
                    finally { repair.Close(); File.Delete(Path.Combine(data, "installation.json")); }
                }
                navigation.SelectedIndex = 2; window.UpdateLayout(); Screenshot(window, Path.Combine(output, "music-finder.png"));
                window.Width = 760; window.Height = 560; window.UpdateLayout(); Check(window.ActualWidth >= 760 && window.ActualHeight >= 560, "minimum responsive size");
                Check(System.Windows.PresentationSource.FromVisual(window)?.CompositionTarget is not null, "native DPI-aware rendering surface");
                using (var exportTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(15)))
                {
                    var choosing = NativeExportDialog.ChoosePathAsync("effect.json", exportTimeout.Token);
                    var dialog = IntPtr.Zero;
                    for (var i = 0; i < 100 && dialog == IntPtr.Zero && !choosing.IsCompleted; i++) { await Task.Delay(50); dialog = FindWindow(null, NativeExportDialog.Title); }
                    // Surface initialization errors from the dialog thread before testing its HWND.
                    if (choosing.IsCompleted)
                    {
                        var earlyResult = await choosing;
                        throw new Exception("Save As closed before its window became visible. Result: " + (earlyResult ?? "canceled"));
                    }
                    Check(dialog != IntPtr.Zero && IsWindowVisible(dialog), "effect export opens the Windows Save As file browser");
                    PostMessage(dialog, 0x0010, IntPtr.Zero, IntPtr.Zero);
                    Check(await choosing.WaitAsync(TimeSpan.FromSeconds(5)) is null, "canceling the native file browser returns without saving");
                }
                Console.WriteLine($"{checks} native UI checks passed.");
            }
            catch (Exception ex) { Console.Error.WriteLine(ex); result = 1; }
            finally { window.Close(); }
        };
        app.Run(window); return result;
    }
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr FindWindow(string? className, string windowName);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr window, uint message, IntPtr wparam, IntPtr lparam);
    private static IEnumerable<T> Descendants<T>(DependencyObject parent) where T : DependencyObject
    {
        for (var i = 0; i < VisualTreeHelper.GetChildrenCount(parent); i++)
        {
            var child = VisualTreeHelper.GetChild(parent, i); if (child is T match) yield return match;
            foreach (var descendant in Descendants<T>(child)) yield return descendant;
        }
    }
    private static void Screenshot(Window window, string path)
    {
        var bitmap = new RenderTargetBitmap((int)window.ActualWidth, (int)window.ActualHeight, 96, 96, PixelFormats.Pbgra32); bitmap.Render(window);
        var encoder = new PngBitmapEncoder(); encoder.Frames.Add(BitmapFrame.Create(bitmap)); using var file = File.Create(path); encoder.Save(file);
    }
}
