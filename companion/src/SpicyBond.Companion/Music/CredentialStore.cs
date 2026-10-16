using Windows.Security.Credentials;
namespace SpicyBond.Companion.Music;
public static class CredentialStore
{
    private const string Resource = "SpicyBond";
    public static string Get(string name)
    {
        try { var item = new PasswordVault().Retrieve(Resource, name); item.RetrievePassword(); return item.Password; }
        catch (Exception)
        {
            try { var legacy = new PasswordVault().Retrieve("RetroWave", name); legacy.RetrievePassword(); return legacy.Password; }
            catch (Exception) { return ""; }
        }
    }
    public static void Set(string name, string value)
    {
        var vault = new PasswordVault();
        try { vault.Remove(vault.Retrieve(Resource, name)); } catch (Exception) { }
        try { vault.Remove(vault.Retrieve("RetroWave", name)); } catch (Exception) { }
        if (value.Length > 0) vault.Add(new PasswordCredential(Resource, name, value));
    }
}
