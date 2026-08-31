/* Assemble the nine Figma Sound X clips into one campaign film.
   Full clip lengths. Each slide fades in from black and out to black,
   then they concatenate — a clean campaign cut without overlapping time.

   Usage:
     node scripts/export-figma-x-campaign.mjs
     node scripts/export-figma-x-campaign.mjs --dir exports/figma-sound-x
*/

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DIR = resolve(root, flag("--dir", "exports/figma-sound-x"));
const OUT = resolve(DIR, flag("--out", "00-figma-sound-campaign.mp4"));
const EDGE = Number(flag("--fade", "0.55"));
const OPEN = 0.4;
const CLOSE = 0.8;

const clips = readdirSync(DIR)
  .filter((name) => /^\d{2}-.+\.mp4$/.test(name) && !name.startsWith("00-"))
  .sort()
  .map((name) => resolve(DIR, name));

if (clips.length < 2) {
  throw new Error(`need at least two slide mp4s in ${DIR}`);
}

const run = (bin, ffmpegArgs) => {
  const result = spawnSync(bin, ffmpegArgs, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${bin} failed`);
  }
  return result.stdout;
};

const durationOf = (file) => {
  const value = Number.parseFloat(run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]).trim());
  if (!Number.isFinite(value)) throw new Error(`no duration for ${file}`);
  return value;
};

const durs = clips.map(durationOf);
const last = clips.length - 1;
const vParts = [];
const aParts = [];
const concatPads = [];

for (let i = 0; i < clips.length; i += 1) {
  const fadeIn = i === 0 ? OPEN : EDGE;
  const fadeOut = i === last ? CLOSE : EDGE;
  const outAt = Math.max(0, durs[i] - fadeOut);
  vParts.push(
    `[${i}:v]fps=25,scale=1920:1080:flags=lanczos,format=yuv420p,` +
    `fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${outAt.toFixed(3)}:d=${fadeOut},` +
    `setpts=PTS-STARTPTS[v${i}]`,
  );
  aParts.push(
    `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,` +
    `apad=whole_dur=${durs[i].toFixed(3)},atrim=0:${durs[i].toFixed(3)},` +
    `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${outAt.toFixed(3)}:d=${fadeOut},` +
    `asetpts=PTS-STARTPTS[a${i}]`,
  );
  concatPads.push(`[v${i}][a${i}]`);
}

const graph = [
  ...vParts,
  ...aParts,
  `${concatPads.join("")}concat=n=${clips.length}:v=1:a=1[vout][aout]`,
].join(";");

const result = spawnSync("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  ...clips.flatMap((file) => ["-i", file]),
  "-filter_complex", graph,
  "-map", "[vout]",
  "-map", "[aout]",
  "-r", "25",
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-preset", "slow",
  "-crf", "18",
  "-c:a", "aac",
  "-b:a", "192k",
  "-movflags", "+faststart",
  OUT,
], { encoding: "utf8" });

if (result.status !== 0) {
  throw new Error(result.stderr || result.stdout || "ffmpeg campaign encode failed");
}

const total = durationOf(OUT);
console.log(`Wrote ${OUT}`);
console.log(`${clips.length} slides, ${EDGE}s fades, ${total.toFixed(2)}s`);
