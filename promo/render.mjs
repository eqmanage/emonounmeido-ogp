// video.html の render(t) をフレームごとに呼び、PlaywrightのスクリーンショットをffmpegへパイプしてMP4化する。
// 使い方: node promo/render.mjs [--stills]   (--stills: 確認用の静止画だけを書き出す)
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(dir, 'out');
mkdirSync(outDir, { recursive: true });

const FPS = 30;
const DURATION = 15;
const stillsOnly = process.argv.includes('--stills');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(dir, 'video.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

if (stillsOnly) {
  for (const t of [0.5, 1.0, 1.9, 2.4, 3.2, 4.6, 6.0, 8.5, 9.9, 11.0, 12.1, 13.0, 14.9]) {
    await page.evaluate((x) => window.render(x), t);
    await page.screenshot({ path: path.join(outDir, `still_${t.toFixed(1)}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const ff = spawn('ffmpeg', [
  '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow',
  path.join(outDir, 'video_noaudio.mp4'),
], { stdio: ['pipe', 'inherit', 'inherit'] });

const total = FPS * DURATION;
for (let i = 0; i < total; i++) {
  await page.evaluate((x) => window.render(x), i / FPS);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 60 === 0) process.stderr.write(`frame ${i}/${total}\n`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
