import identity from '../../../branding.json' with { type: 'json' };

export const brand = {
  ...identity,
  // Publishable browser key supplied for this application. Never put a secret key here.
  lyricsKey: 'sl_pk_1Sz62Xrf_vr6U6zA2RgyiXqtigEUmuGixgCTcE8vxu4',
} as const;

/** Keep preferences made before the rebrand, including an intentionally blank key. */
export function migrateBrowserBranding(): void {
  try {
    for (const suffix of ['settings-v1', 'settings-pending-v1', 'spicy-key', 'custom-effects-v1', 'custom-effects-v1-enabled', 'custom-effects-v1-overlay']) {
      const current = `spicy-bond-${suffix}`, legacy = localStorage.getItem(`retrowave-${suffix}`);
      if (localStorage.getItem(current) === null && legacy !== null) localStorage.setItem(current, legacy);
      // Acknowledged queues are removed. Retire the copied legacy queue so a later
      // reload cannot recreate it and replay stale edits over the companion JSON.
      if (suffix === 'settings-pending-v1' && localStorage.getItem(current) !== null) localStorage.removeItem(`retrowave-${suffix}`);
    }
  } catch { /* Restricted profiles can still run with session defaults. */ }
}
