import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function finishDemoVideo(input, output = 'docs/media/spicy-bond-demo.mp4') {
  const probe = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate,nb_frames:format=duration', '-of', 'json', file], { encoding: 'utf8' }));
  const source = probe(input), stream = source.streams[0];
  if (stream.r_frame_rate !== '30/1' || Number(stream.nb_frames) !== 360) throw new Error('Expected the 12-second, 30 fps app capture. Run capture:video to regenerate it.');
  const ease = 'A*(P*P*(3-2*P))+B*(1-P*P*(3-2*P))';
  const filters = [
    '[0:v]split=3[a][b][c]',
    '[a]trim=0:4,setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop=24,fps=30,settb=1/30[first]',
    '[b]trim=4:8,setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop=24,fps=30,settb=1/30[second]',
    '[c]trim=8:12,setpts=PTS-STARTPTS,fps=30,settb=1/30[third]',
    `[first][second]xfade=transition=custom:duration=0.8:offset=4:expr='${ease}'[joinedRaw]`,
    '[joinedRaw]fps=30,settb=1/30[joined]',
    `[joined][third]xfade=transition=custom:duration=0.8:offset=8:expr='${ease}'[smooth]`,
    '[1:v]scale=48:48:flags=lanczos,format=rgba[logo]',
    '[smooth][logo]overlay=x=W-w-24:y=H-h-24:shortest=1,fade=t=in:st=0:d=0.25,fade=t=out:st=11.65:d=0.35,format=yuv420p[out]',
  ].join(';');
  await mkdir('docs/media', { recursive: true });
  await mkdir('.build/media-source', { recursive: true });
  const temporary = '.build/media-source/spicy-bond-finished.mp4';
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-loop', '1', '-framerate', '30', '-i', 'docs/brand/logo.png', '-filter_complex_threads', '1', '-filter_complex', filters, '-map', '[out]', '-an', '-frames:v', '360', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-threads', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', temporary]);
  const result = probe(temporary), final = result.streams[0];
  if (final.r_frame_rate !== '30/1' || final.avg_frame_rate !== '30/1' || Number(final.nb_frames) !== 360 || Math.abs(Number(result.format.duration) - 12) > .001) throw new Error('Unexpected finished video timing');
  await rename(temporary, output);
  await writeFile('docs/media/capture.json', JSON.stringify({ ...result,
    capture: 'Running app; evenly stepped browser animation clock',
    audio: 'Silent visual preview; simulated spectrum, locally authored cover art and public-domain composition lyrics.',
    fps: 30, frames: 360,
    transitions: { type: 'Cubic eased cross-dissolve', durationSeconds: .8, atSeconds: [4, 8], introFadeSeconds: .25, outroFadeSeconds: .35 },
    branding: 'Static connected-record badge in the video corner; app UI unchanged.',
  }, null, 2) + '\n');
  console.log(`Verified ${final.width}×${final.height}, 30 fps, 12 seconds, with two eased 0.8-second transitions.`);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await finishDemoVideo(process.argv[2] || '.build/media-source/spicy-bond-raw.mp4', process.argv[3]).catch(error => { console.error(error.stderr?.toString() || error.message); process.exitCode = 1; });
