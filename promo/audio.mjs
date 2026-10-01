// 15秒動画用のBGM・効果音を外部素材なしで合成し、WAVで書き出す(著作権フリー)。
// キューのタイミングは video.html のタイムライン(T / PAIRS / スロット)と揃えている。
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100;
const DUR = 15;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 12345;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function add(t0, len, fn, gain = 1, pan = 0) {
  const s0 = Math.floor(t0 * SR);
  const n = Math.floor(len * SR);
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < n && s0 + i < N; i++) {
    if (s0 + i < 0) continue;
    const v = fn(i / SR, i / n);
    L[s0 + i] += v * gl;
    R[s0 + i] += v * gr;
  }
}

/* ---- 音色 ---- */
const tick = (t0, g = 0.35, f = 2400) =>
  add(t0, 0.04, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 140), g);
function kick(t0, g = 0.9) {
  let ph = 0;
  add(t0, 0.5, (t) => {
    ph += (2 * Math.PI * (45 + 110 * Math.exp(-t * 30))) / SR;
    return Math.sin(ph) * Math.exp(-t * 7);
  }, g);
}
function boom(t0, g = 1) {
  let ph = 0;
  add(t0, 1.6, (t) => {
    ph += (2 * Math.PI * (32 + 70 * Math.exp(-t * 12))) / SR;
    return Math.tanh(1.8 * Math.sin(ph)) * Math.exp(-t * 2.6) + rand() * 0.25 * Math.exp(-t * 25);
  }, g);
}
function whoosh(t0, len, g = 0.35, rising = true) {
  let lp = 0;
  add(t0, len, (t, p) => {
    const q = rising ? p : 1 - p;
    const a = 0.02 + 0.5 * q * q; // フィルター係数を動かして明るさを変える
    lp += a * (rand() - lp);
    return lp * Math.sin(Math.PI * p);
  }, g);
}
function bell(t0, midi, g = 0.25, len = 1.8, pan = 0) {
  const f = mtof(midi);
  add(t0, len, (t) =>
    (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t * 3) +
      0.15 * Math.sin(2 * Math.PI * f * 3.98 * t) * Math.exp(-t * 6)) *
    Math.exp(-t * 2.2) * Math.min(1, t * 400), g, pan);
}
function pad(t0, len, midis, g = 0.06) {
  add(t0, len, (t, p) => {
    const env = Math.min(1, t / 0.3) * Math.min(1, (1 - p) * len / 0.4);
    let v = 0;
    for (const m of midis) {
      const f = mtof(m);
      v += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 1.003 * t + 1);
    }
    return v * env;
  }, g);
}
function clap(t0, g = 0.25) {
  let hp = 0, prev = 0;
  add(t0, 0.18, (t) => {
    const x = rand();
    hp = 0.7 * (hp + x - prev); prev = x;
    return hp * Math.exp(-t * 28);
  }, g);
}

/* ---- S1: フック(0–2.5s) ---- */
[0.0, 0.5, 1.0].forEach((t) => tick(t, 0.3, 1800));
boom(0.35, 0.9);
// 年齢カウンター(45→65)の数字が変わるたびにチック。easeIn と同じ曲線で加速させる
for (let k = 1; k <= 20; k++) {
  const x = Math.cbrt((k - 0.5) / 20);
  tick(1.3 + x * 0.85, 0.22, 2000 + k * 60);
}
boom(2.15, 0.7);
whoosh(2.05, 0.5, 0.5, true);

/* ---- S2: 翻訳の連打(2.5–9.5s) ---- */
const PAIRS_DUR = [1.75, 1.5, 1.25, 0.9, 0.85, 0.75];
let acc = 0.15;
PAIRS_DUR.forEach((d) => {
  const fast = d < 1;
  const tStrike = fast ? 0.12 : 0.28, tNew = fast ? 0.22 : 0.48;
  const base = 2.5 + acc;
  whoosh(base + tStrike - 0.02, 0.16, 0.25, false);
  kick(base + tNew, 0.85);
  clap(base + tNew, 0.18);
  acc += d;
});
// ハット:テンポ感を出す8分刻み(BPM 128)
for (let t = 2.5; t < 9.4; t += 60 / 128 / 2) add(t, 0.05, (x) => rand() * Math.exp(-x * 90), 0.06, 0.3);
// 希望に向かうコード進行(F → G → Am → C)
pad(2.5, 1.9, [53, 57, 60, 64]);
pad(4.4, 1.6, [55, 59, 62, 67]);
pad(6.0, 1.6, [57, 60, 64, 69]);
pad(7.6, 1.9, [60, 64, 67, 72]);

/* ---- S3: 問いかけ+スロット(9.5–12.3s) ---- */
boom(9.5, 0.6);
pad(9.5, 2.8, [50, 57, 62, 65], 0.05);
let last = -1;
for (let i = 0; i < SR * 1.6; i += 64) {
  const lt = 0.7 + i / SR;
  const sp = Math.min(1, (lt - 0.7) / 1.6);
  const n = Math.floor(28 * (1 - Math.pow(1 - sp, 2)));
  if (n !== last) { tick(9.5 + lt, 0.25, 3000); last = n; }
}
whoosh(10.3, 1.5, 0.25, true);
kick(11.8, 1.0);
bell(11.8, 74, 0.22);

/* ---- S4: CTA(12.3–15s) ---- */
[72, 76, 79, 84].forEach((m, i) => bell(12.3 + i * 0.12, m, 0.18, 2.2, (i - 1.5) * 0.3));
pad(12.3, 2.7, [48, 55, 60, 64, 67], 0.06);
kick(12.3, 0.6);
bell(12.85, 88, 0.12, 2, 0.2);

/* ---- マスター: ソフトクリップ+末尾フェード ---- */
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.95 / Math.tanh(Math.max(1, peak * 0.9));
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = t > 14.4 ? Math.max(0, (15 - t) / 0.6) : 1;
  const l = Math.tanh(L[i] * 0.9) * norm * fade, r = Math.tanh(R[i] * 0.9) * norm * fade;
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r)) * 32767), 46 + i * 4);
}
mkdirSync(path.join(dir, 'out'), { recursive: true });
writeFileSync(path.join(dir, 'out', 'audio.wav'), buf);
console.log('wrote out/audio.wav');
