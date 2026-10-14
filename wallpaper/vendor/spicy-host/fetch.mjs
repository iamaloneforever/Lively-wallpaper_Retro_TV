import { PageContainer } from './page.mjs';
// Provider lookup remains in RetroWave's authenticated/consented controller.
export function ClearLyricsPageContainer() { PageContainer?.querySelector('.LyricsContent')?.replaceChildren(); }
