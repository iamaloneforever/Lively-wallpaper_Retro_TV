import type { Track } from '../lively/types';
import { parseLyrics, type Lyrics } from '../lyrics/Lyrics';

// Public-domain compositions. Covers and preview timing are authored for Spicy Bond;
// this is a silent visual demo, not a recording or a provider response.
export const demoTracks: Track[] = [
  { title: 'Daisy Bell', artist: 'Harry Dacre', album: 'Bicycle Built for Two · 1892', trackNumber: 1, genres: ['SOUL', 'POP'], albumArtist: '', thumbnail: null, subtitle: 'PUBLIC-DOMAIN SONG · VISUAL PREVIEW', playbackType: 'Music' },
  { title: 'Amazing Grace', artist: 'John Newton', album: 'A little soul · 1779', trackNumber: 2, genres: ['AMBIENT', 'SOUL'], albumArtist: '', thumbnail: null, subtitle: 'PUBLIC-DOMAIN SONG · VISUAL PREVIEW', playbackType: 'Music' },
  { title: 'Auld Lang Syne', artist: 'Robert Burns', album: 'For old times · 1788', trackNumber: 3, genres: ['JAZZ', 'FOLK'], albumArtist: '', thumbnail: null, subtitle: 'PUBLIC-DOMAIN SONG · VISUAL PREVIEW', playbackType: 'Music' },
];
const verses = [
  ['Daisy, Daisy,', 'Give me your answer, do!', "I'm half crazy,", 'All for the love of you!', "It won't be a stylish marriage,", "I can't afford a carriage,", "But you'll look sweet upon the seat", 'Of a bicycle built for two.'],
  ['Amazing grace! How sweet the sound', 'That saved a wretch like me!', 'I once was lost, but now am found;', 'Was blind, but now I see.', "’Twas grace that taught my heart to fear,", 'And grace my fears relieved;', 'How precious did that grace appear', 'The hour I first believed.'],
  ['Should auld acquaintance be forgot,', 'And never brought to mind?', 'Should auld acquaintance be forgot,', 'And auld lang syne?', 'For auld lang syne, my dear,', 'For auld lang syne,', "We’ll tak a cup o’ kindness yet,", 'For auld lang syne.'],
];
export const demoLyrics: Lyrics[] = verses.map(lines => parseLyrics({ Body: {
  Type: 'Syllable', source: 'demo', StartTime: 0,
  Content: lines.map((text, i) => {
    const words = text.split(' '), start = i * 4.25, duration = 3.9 / words.length;
    return { Type: 'Vocal', Lead: { StartTime: start, EndTime: start + 4.1, Syllables: words.map((Text, j) => ({ Text, StartTime: start + j * duration, EndTime: start + (j + 1) * duration })) } };
  }),
} })!);

export function demoArtwork(index: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const palettes = [['#6b3fa0', '#241534', '#f5df48'], ['#d5a545', '#3f2958', '#fff1c5'], ['#8e78b9', '#30213e', '#f5df48']];
  const [base, ink, cream] = palettes[index % 3];
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = cream; ctx.beginPath(); ctx.arc(312, 233, 144, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(0, 390);
  ctx.bezierCurveTo(160, 170, 266, 500, 512, 240); ctx.lineTo(512, 512); ctx.lineTo(0, 512); ctx.fill();
  ctx.strokeStyle = base; ctx.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(0, 420 + i * 9); ctx.bezierCurveTo(150, 200 + i * 9, 270, 540 + i * 9, 512, 300 + i * 9); ctx.stroke(); }
  ctx.fillStyle = cream; ctx.font = '14px monospace'; ctx.fillText('SPICY BOND / SONGBOOK', 32, 44); ctx.fillText('0' + (index + 1), 455, 44);
  ctx.font = 'bold italic 64px Georgia'; ctx.fillText(['Daisy', 'Amazing', 'Auld lang'][index], 30, 125); ctx.fillText(['Bell.', 'grace.', 'syne.'][index], 30, 190);
  ctx.font = '13px monospace'; ctx.fillText('FEEL THE CONNECTION.', 32, 478);
  return canvas;
}
export function demoSpectrum(time: number, bass: number, treble: number): number[] {
  return Array.from({ length: 128 }, (_, i) => {
    const pulse = Math.pow(0.5 + Math.sin(time * 2.8) * 0.5, 3);
    const weight = i < 20 ? bass : i > 75 ? treble : 0.65;
    return Math.max(0, (0.19 + 0.45 * pulse + 0.2 * Math.sin(i * 0.26 + time * 1.7) + 0.13 * Math.sin(i * 0.1 - time)) * Math.exp(-i / 180) * weight);
  });
}
