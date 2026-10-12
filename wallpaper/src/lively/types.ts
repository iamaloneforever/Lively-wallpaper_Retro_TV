export interface Track {
  title: string; artist: string; album: string; albumArtist: string;
  thumbnail: string | null; trackNumber: number | null; genres: string[];
  subtitle: string; playbackType: string;
}
declare global {
  interface Window {
    livelyCurrentTrack?: (data: string) => void;
    livelyAudioListener?: (audio: number[]) => void;
    livelyWallpaperPlaybackChanged?: (data: string) => void;
  }
}
