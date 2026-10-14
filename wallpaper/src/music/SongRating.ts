import type { SongCandidate } from './SongSearch';
export interface SongRating {
  score: number; title: number; singer: number | null; duration: number | null;
  popularity: number; repetition: number; sources: number;
}
export interface RatedSong { candidate: SongCandidate; rating: SongRating }
const normalize = (value: string): string => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function nameSimilarity(left: string, right: string): number {
  left = normalize(left); right = normalize(right);
  if (!left || !right) return 0;
  if (left === right) return 100;
  const words = new Set(left.split(' ')), other = new Set(right.split(' '));
  const overlap = [...words].filter(word => other.has(word)).length / Math.max(words.size, other.size);
  const pairs = (value: string) => new Set(Array.from({ length: Math.max(0, value.length - 1) }, (_, i) => value.slice(i, i + 2)));
  const a = pairs(left), b = pairs(right);
  const dice = a.size + b.size ? 2 * [...a].filter(pair => b.has(pair)).length / (a.size + b.size) : 0;
  return Math.round(Math.max(overlap, dice) * 100);
}
function sameRecording(a: SongCandidate, b: SongCandidate): boolean {
  if (a.spotifyId && b.spotifyId) return a.spotifyId === b.spotifyId;
  if (a.mbid && b.mbid) return a.mbid === b.mbid;
  return normalize(a.title) === normalize(b.title) && normalize(a.artist) === normalize(b.artist) &&
    a.duration > 0 && b.duration > 0 && Math.abs(a.duration - b.duration) <= 2;
}
export function rateSongs(candidates: SongCandidate[], title: string, singer: string, duration: number): RatedSong[] {
  return candidates.map(candidate => {
    const sources = new Set(candidates.filter(other => sameRecording(candidate, other)).map(other => other.provider)).size || 1;
    const rating: SongRating = {
      score: 0, title: nameSimilarity(title, candidate.title), singer: singer.trim() ? nameSimilarity(singer, candidate.artist) : null,
      duration: duration > 0 && candidate.duration > 0 ? Math.round(Math.max(0, 1 - Math.abs(duration - candidate.duration) / Math.max(8, duration * .08)) * 100) : null,
      popularity: Number.isFinite(candidate.sourcePopularity) ? Math.max(0, Math.min(100, candidate.sourcePopularity!)) : 50,
      repetition: Math.min(100, Math.max(0, sources - 1) * 50), sources,
    };
    const factors: [number | null, number][] = [[rating.title, 40], [rating.singer, 25], [rating.duration, 20], [rating.popularity, 10], [rating.repetition, 5]];
    const available = factors.filter((factor): factor is [number, number] => factor[0] !== null);
    rating.score = Math.round(available.reduce((sum, [score, weight]) => sum + score * weight, 0) / available.reduce((sum, [, weight]) => sum + weight, 0));
    return { candidate, rating };
  }).sort((a, b) => b.rating.score - a.rating.score || a.candidate.title.localeCompare(b.candidate.title));
}
