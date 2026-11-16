// Entry point the grader runs with MAKEFUN_OUTPUT_DIR set (default /output):
// copies this directory's app/ (plain static files, no build step) and
// screenshots/ out, then writes dossier.json with the vendored make.fun library.
// Leave vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to
// be byte for byte what its own copy writes.
//
// A starting point, not a winner: a plain board of open bounties and a page for each. Build your frontend in app/
// (a leaderboard, profiles, speed, ease of use), put 3 PNG or JPEG screenshots of it running on live data in
// screenshots/ (the first by name is the cover; shots.json says which views this starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The entry must carry the frontend itself; without app/index.html there is nothing to serve.
const appSrc = join(here, 'app');
if (!existsSync(join(appSrc, 'index.html'))) {
  console.error('main.ts: app/index.html is missing — the frontend folder is incomplete.');
  process.exit(1);
}

// Create the output folder (and its screenshots/ subfolder), then copy the app
// and, when present, the screenshots.
mkdirSync(out, { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(appSrc, join(out, 'app'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// A recursive size tally for one folder: file count and total bytes.
function tally(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      const sub = tally(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += statSync(full).size;
    }
  }
  return { files, bytes };
}

const appStats = tally(join(out, 'app'));
const shotStats = tally(join(out, 'screenshots'));
console.log(
  `main.ts: copied app/ (${appStats.files} files, ${appStats.bytes} bytes) and screenshots/ ` +
    `(${shotStats.files} files, ${shotStats.bytes} bytes) to ${out}`,
);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 3 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 16 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);
console.log('main.ts: wrote dossier.json');
