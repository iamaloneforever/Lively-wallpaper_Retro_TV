using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using SpicyBond.Companion;

namespace SpicyBond.Setup;

internal sealed class SetupWindow : Window
{
    private readonly StackPanel options = new();
    private readonly TextBlock status = new() { TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 16, 0, 0) };
    private bool busy;

    public SetupWindow()
    {
        Title = "Spicy Bond setup"; Width = 640; Height = 760; MinWidth = 540; MinHeight = 600;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        FontFamily = new FontFamily("Segoe UI Variable, Segoe UI"); FontSize = 14;
        ApplyTheme();
        Microsoft.Win32.SystemEvents.UserPreferenceChanged += PreferenceChanged;
        Closed += (_, _) => Microsoft.Win32.SystemEvents.UserPreferenceChanged -= PreferenceChanged;
        Icon = BrandIcon.Load(32);
        SourceInitialized += (_, _) => WindowBackdrop.Apply(this);
        Closing += (_, e) => { if (busy) e.Cancel = true; };
        var body = new StackPanel { Margin = new Thickness(32) };
        Content = new ScrollViewer { Content = body, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        body.Children.Add(new Image { Source = BrandIcon.Load(48), Width = 48, Height = 48, HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 0, 0, 16) });
        body.Children.Add(new TextBlock { Text = "Set up Spicy Bond", FontSize = 28, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 0, 0, 12) });
        body.Children.Add(new TextBlock { Text = "Connect Lively to your music. The optional companion supplies the playback clock without a Spotify account.", TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 24) });
        body.Children.Add(options);
        var preferences = AppSettings.Load();
        options.Children.Add(new TextBlock { Text = "Installation folder", FontWeight = FontWeights.SemiBold });
        options.Children.Add(new TextBlock { Text = "Per-user installation · no elevation", Opacity = .65, Margin = new Thickness(0, 4, 0, 8) });
        var folderRow = new Grid(); folderRow.ColumnDefinitions.Add(new()); folderRow.ColumnDefinitions.Add(new() { Width = GridLength.Auto });
        var destination = new TextBox { Text = preferences.InstallDirectory, MinHeight = 34, VerticalContentAlignment = VerticalAlignment.Center };
        System.Windows.Automation.AutomationProperties.SetName(destination, "Installation folder"); folderRow.Children.Add(destination);
        var browse = new Button { Content = "Browse…", Margin = new Thickness(8, 0, 0, 0), Padding = new Thickness(14, 6, 14, 6) }; Grid.SetColumn(browse, 1); folderRow.Children.Add(browse); options.Children.Add(folderRow);
        browse.Click += (_, _) => { var picker = new Microsoft.Win32.OpenFolderDialog { InitialDirectory = destination.Text, Title = "Choose installation folder" }; if (picker.ShowDialog(this) == true) destination.Text = picker.FolderName; };
        CheckBox Choice(string text, bool selected = false)
        {
            var control = new CheckBox { Content = new TextBlock { Text = text, TextWrapping = TextWrapping.Wrap }, IsChecked = selected, Margin = new Thickness(0, 12, 0, 0) };
            options.Children.Add(control); return control;
        }
        var installed = new WallpaperInstaller(CompanionRuntime.Root, "").ReadState();
        var lyrics = Choice("Install the companion for synchronized lyrics", installed?.Companion ?? true);
        var startup = Choice("Start Spicy Bond when I sign in to Windows", preferences.Startup);
        var catalog = Choice("Allow external catalogue matching (shares song metadata with enabled catalogue services)", lyrics.IsChecked == true && preferences.ExternalConsent);
        catalog.IsEnabled = lyrics.IsChecked == true;
        var lrclib = Choice("Allow LRCLIB fallback (shares song metadata)", preferences.LrcLib);
        var experimental = Choice("Consent to experimental Spotify lookup (unofficial)", preferences.ExperimentalConsent);
        var desktop = Choice("Create a desktop shortcut");
        var launch = Choice("Open Spicy Bond after installation", true);
        lyrics.Unchecked += (_, _) => { catalog.IsChecked = false; catalog.IsEnabled = false; };
        lyrics.Checked += (_, _) => catalog.IsEnabled = true;
        options.Children.Add(new TextBlock { Text = "Optional catalogue services receive song metadata. Matching and sign-in startup are off by default for new installations.", TextWrapping = TextWrapping.Wrap, Opacity = .65, Margin = new Thickness(0, 16, 0, 20) });
        var actions = new WrapPanel(); options.Children.Add(actions);
        Button Action(string label)
        {
            var button = new Button { Content = label, Padding = new Thickness(14, 8, 14, 8), Margin = new Thickness(0, 0, 8, 8) }; actions.Children.Add(button); return button;
        }
        var install = Action("Install / repair");
        install.SetResourceReference(StyleProperty, "AccentButtonStyle");
        var uninstall = Action("Uninstall"); var open = Action("Open Spicy Bond"); body.Children.Add(status);
        var licenses = Action("Licenses");
        licenses.Click += (_, _) => { try { LicenseMaterials.Show(); } catch (Exception ex) { status.Text = ex.Message; } };
        options.Children.Add(new TextBlock { Text = "Companion code: MIT. Combined web wallpaper: AGPL-3.0. Microsoft runtime components have separate terms. Read Licenses before installing or redistributing.", TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 8, 0, 8) });
        open.Click += (_, _) =>
        {
            if (!File.Exists(WindowsSetup.Executable)) { status.Text = "Install Spicy Bond first."; return; }
            try { Process.Start(new ProcessStartInfo(WindowsSetup.Executable) { UseShellExecute = true })?.Dispose(); }
            catch (Exception) { status.Text = "Could not open Spicy Bond. Run install / repair."; }
        };
        async Task Execute(Func<string> action)
        {
            busy = true; options.IsEnabled = false; status.Text = "Working… Please keep setup open.";
            try { status.Text = await Task.Run(action); }
            catch (Exception ex) { status.Text = ex.Message; }
            finally { busy = false; options.IsEnabled = true; }
        }
        install.Click += async (_, _) =>
        {
            var withLyrics = lyrics.IsChecked == true; var withCatalog = catalog.IsChecked == true;
            var withStartup = startup.IsChecked == true; var path = destination.Text;
            var withDesktop = desktop.IsChecked == true; var withLaunch = launch.IsChecked == true;
            var withLrc = lrclib.IsChecked == true; var withExperimental = experimental.IsChecked == true;
            await Execute(() =>
            {
                return WindowsSetup.Install(withLyrics, withCatalog, withStartup, path, withDesktop, withLaunch, withLrc, withExperimental);
            });
        };
        uninstall.Click += async (_, _) => await Execute(WindowsSetup.Uninstall);
    }
    private void PreferenceChanged(object sender, Microsoft.Win32.UserPreferenceChangedEventArgs e)
        => Dispatcher.BeginInvoke(() => ApplyTheme());
    private void ApplyTheme()
    {
        var selected = AppSettings.Load().Theme;
#pragma warning disable WPF0001
        ThemeMode = selected switch { "Light" => System.Windows.ThemeMode.Light, "Dark" => System.Windows.ThemeMode.Dark, _ => System.Windows.ThemeMode.System };
#pragma warning restore WPF0001
        using var personalize = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
        var dark = selected == "Dark" || (selected == "System" && personalize?.GetValue("AppsUseLightTheme") is int light && light == 0);
        Resources.MergedDictionaries.Clear();
        Resources.MergedDictionaries.Add(new ResourceDictionary { Source = new Uri("pack://application:,,,/PresentationFramework.Fluent;component/Themes/" + (SystemParameters.HighContrast ? "Fluent.xaml" : dark ? "Fluent.Dark.xaml" : "Fluent.Light.xaml")) });
        Background = SystemParameters.HighContrast ? SystemColors.WindowBrush : new SolidColorBrush(dark ? Color.FromRgb(32, 32, 32) : Color.FromRgb(243, 243, 243));
        Foreground = SystemParameters.HighContrast ? SystemColors.WindowTextBrush : new SolidColorBrush(dark ? Colors.White : Color.FromRgb(27, 27, 27));
    }
}
