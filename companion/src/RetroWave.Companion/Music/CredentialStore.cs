using Windows.Security.Credentials;
namespace RetroWave.Companion.Music;
public static class CredentialStore
{
    private const string Resource = "RetroWave";
    public static string Get(string name)
    {
        try { var item = new PasswordVault().Retrieve(Resource, name); item.RetrievePassword(); return item.Password; }
        catch (Exception) { return ""; }
    }
    public static void Set(string name, string value)
    {
        var vault = new PasswordVault();
        try { vault.Remove(vault.Retrieve(Resource, name)); } catch (Exception) { }
        if (value.Length > 0) vault.Add(new PasswordCredential(Resource, name, value));
    }
}
