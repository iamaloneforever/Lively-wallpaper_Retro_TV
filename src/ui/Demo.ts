import type { Track } from '../lively/types';
export const demoTracks: Track[] = [
  { title: 'After the rain', artist: 'The Sunday Service', album: 'Soft focus', trackNumber: 3, genres: ['DOWNTEMPO', 'SOUL'], albumArtist: '', thumbnail: null, subtitle: 'A FICTIONAL RECORD FOR YOUR LISTENING IMAGINATION', playbackType: 'Music' },
  { title: 'Midnight on the coast', artist: 'Juniper FM', album: 'Low tide radio', trackNumber: 7, genres: ['AMBIENT', 'ELECTRONIC'], albumArtist: '', thumbnail: null, subtitle: 'A FICTIONAL RECORD FOR YOUR LISTENING IMAGINATION', playbackType: 'Music' },
  { title: 'Golden hour', artist: 'Mira & the Satellites', album: 'Days like these', trackNumber: 1, genres: ['JAZZ', 'INSTRUMENTAL'], albumArtist: '', thumbnail: null, subtitle: 'A FICTIONAL RECORD FOR YOUR LISTENING IMAGINATION', playbackType: 'Music' },
];
export function demoArtwork(index: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const palettes = [['#bf9b6a', '#243d34', '#d9ccb0'], ['#697f85', '#1f3540', '#ceba90'], ['#c87b51', '#543a36', '#efc58b']];
  const [base, ink, cream] = palettes[index % 3];
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = cream; ctx.beginPath(); ctx.arc(312, 204, 138, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(0, 390);
  ctx.bezierCurveTo(160, 170, 266, 500, 512, 240); ctx.lineTo(512, 512); ctx.lineTo(0, 512); ctx.fill();
  ctx.strokeStyle = base; ctx.lineWidth = 1.5;
  for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.moveTo(0, 420 + i * 9); ctx.bezierCurveTo(150, 200 + i * 9, 270, 540 + i * 9, 512, 300 + i * 9); ctx.stroke(); }
  ctx.fillStyle = ink; ctx.font = '16px monospace'; ctx.fillText('SUNDAY RECORDS', 32, 47); ctx.fillText('VOL. 0' + (index + 1), 390, 47);
  ctx.font = 'italic 58px Georgia'; ctx.fillText(['Soft', 'Low tide', 'Golden'][index], 32, 123); ctx.fillText(['focus.', 'radio.', 'hour.'][index], 32, 181);
  return canvas;
}
export function demoSpectrum(time: number, bass: number, treble: number): number[] {
  return Array.from({ length: 128 }, (_, i) => {
    const pulse = Math.pow(0.5 + Math.sin(time * 2.8) * 0.5, 3);
    const weight = i < 20 ? bass : i > 75 ? treble : 0.65;
    return Math.max(0, (0.19 + 0.45 * pulse + 0.2 * Math.sin(i * 0.26 + time * 1.7) + 0.13 * Math.sin(i * 0.1 - time)) * Math.exp(-i / 180) * weight);
  });
}
