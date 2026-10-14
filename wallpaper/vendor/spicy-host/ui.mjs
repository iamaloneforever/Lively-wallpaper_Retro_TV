export const IsCompactMode = () => false;
export const IsPIP = false;
export const ArabicPersianRegex = /[\u0600-\u06FF]/;
export function HideLyricsSkeleton() {}
export class Logger { constructor(name) { this.name = name; } warn(...args) { console.warn(this.name, ...args); } error(...args) { console.error(this.name, ...args); } log() {} debug() {} info() {} }
export default Logger;
export function ApplyIsByCommunity(data, container) {
  const people = data.UploadAttribution;
  if (!people) return;
  const credit = document.createElement('div'); credit.className = 'IsByCommunity';
  for (const role of ['Uploader', 'Maker']) {
    const person = people[role];
    if (!person?.username) continue;
    const label = document.createElement('span'); label.textContent = `${role}: ${person.username}`;
    try { const url = new URL(person.url); if (url.protocol === 'https:' && url.hostname === 'spicylyrics.org') {
      const link = document.createElement('a'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.append(label); credit.append(link, ' '); continue;
    } } catch {}
    credit.append(label, ' ');
  }
  container.append(credit);
}
