namespace RetroWave.Companion;

public static class SessionSelection
{
    // All GSMTC publishers are eligible. No player-name allowlist or Spotify preference.
    public static T? Select<T>(T? current, IEnumerable<T> sessions, Func<T, bool> playing) where T : class =>
        current is not null && playing(current) ? current : sessions.FirstOrDefault(playing) ?? current;
}
