using System.Windows;
using System.Windows.Threading;

namespace SpicyBond.Companion;

public static class NativeExportDialog
{
    public const string Title = "Save " + Branding.Name + " effect";
    public static Task<string?> ChoosePathAsync(string filename, CancellationToken cancellation)
    {
        var completion = new TaskCompletionSource<string?>(TaskCreationOptions.RunContinuationsAsynchronously);
        var thread = new Thread(() =>
        {
            Window? owner = null;
            try
            {
                cancellation.ThrowIfCancellationRequested();
                // The playback worker has no UI dispatcher. Give the shell dialog its own STA and owner.
                var dialogOwner = new Window { Width = 1, Height = 1, Opacity = 0, ShowInTaskbar = false, Topmost = true, WindowStyle = WindowStyle.ToolWindow, WindowStartupLocation = WindowStartupLocation.CenterScreen };
                owner = dialogOwner; dialogOwner.Show(); dialogOwner.Activate();
                using var registration = cancellation.Register(() =>
                {
                    if (!dialogOwner.Dispatcher.HasShutdownStarted) dialogOwner.Dispatcher.BeginInvoke(new Action(() => { if (dialogOwner.IsVisible) dialogOwner.Close(); }));
                });
                var dialog = new Microsoft.Win32.SaveFileDialog { Title = Title, FileName = filename, DefaultExt = ".json", Filter = "JSON effect files (*.json)|*.json", AddExtension = true, CheckPathExists = true, OverwritePrompt = true, ValidateNames = true };
                var accepted = dialog.ShowDialog(dialogOwner) == true;
                cancellation.ThrowIfCancellationRequested();
                completion.TrySetResult(accepted ? dialog.FileName : null);
            }
            catch (OperationCanceledException) { completion.TrySetCanceled(cancellation); }
            catch (Exception error) { completion.TrySetException(error); }
            finally
            {
                if (owner?.IsVisible == true) owner.Close();
                Dispatcher.CurrentDispatcher.InvokeShutdown();
            }
        }) { IsBackground = true, Name = Branding.Name + " effect Save As" };
        thread.SetApartmentState(ApartmentState.STA); thread.Start();
        return completion.Task;
    }
}
