/**
 * Generates the PWA icon PNGs from the NEZTA leaf mark, without any image
 * dependency. Re-run after changing the brand colours:
 *
 *   node client/scripts/generate-pwa-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BG = [18, 59, 43]; // #123B2B brand primary
const LEAF = [215, 185, 110]; // #D7B96E brand accent
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'public', 'icons');

/* --------------------------------------------------------------- geometry */

const inside = (x, y, box, leafScale) => {
  // rounded square background
  const radius = box * 0.22;
  const cx = Math.min(Math.max(x, radius), box - radius);
  const cy = Math.min(Math.max(y, radius), box - radius);
  const inSquare = (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;

  // leaf: axis from bottom-left to top-right with a sine-tapered half width
  const ax = box * 0.3;
  const ay = box * 0.76;
  const bx = box * 0.74;
  const by = box * 0.24;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = ((x - ax) * dx + (y - ay) * dy) / len2;
  const along = Math.sqrt(((x - ax) ** 2 + (y - ay) ** 2) - Math.max(t, 0) ** 2 * len2);
  const width = box * 0.155 * leafScale * Math.pow(Math.sin(Math.PI * Math.min(Math.max(t, 0), 1)), 0.75);
  const inLeaf = t > 0.02 && t < 0.98 && along <= width;

  // stem tick at the base of the leaf
  const inStem =
    Math.abs((x - ax) * dy - (y - ay) * dx) / Math.sqrt(len2) <= box * 0.012 &&
    t > -0.06 &&
    t < 0.1;

  return { inSquare, inLeaf, inStem };
};

/* -------------------------------------------------------------------- png */

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function render(size, { leafScale = 1, rounded = true } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 4;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgHits = 0;
      let leafHits = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          const hit = rounded
            ? inside(px, py, size, leafScale)
            : { inSquare: true, ...inside(px, py, size, leafScale) };
          if (hit.inSquare) {
            bgHits += 1;
            if (hit.inLeaf || hit.inStem) leafHits += 1;
          }
        }
      }
      const total = samples * samples;
      const coverage = bgHits / total;
      const leafRatio = leafHits / total;
      const index = (y * size + x) * 4;
      const mix = coverage > 0 ? leafRatio / coverage : 0;
      pixels[index] = Math.round(BG[0] * (1 - mix) + LEAF[0] * mix);
      pixels[index + 1] = Math.round(BG[1] * (1 - mix) + LEAF[1] * mix);
      pixels[index + 2] = Math.round(BG[2] * (1 - mix) + LEAF[2] * mix);
      pixels[index + 3] = Math.round(coverage * 255);
    }
  }
  return encodePng(size, pixels);
}

/* ------------------------------------------------------------------- main */

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  ['icon-192.png', 192, { leafScale: 1 }],
  ['icon-512.png', 512, { leafScale: 1 }],
  ['icon-maskable-512.png', 512, { leafScale: 0.78, rounded: false }],
  ['apple-touch-icon.png', 180, { leafScale: 0.95, rounded: false }],
];

for (const [name, size, options] of targets) {
  writeFileSync(join(OUT_DIR, name), render(size, options));
  console.log('wrote', join('public', 'icons', name), `${size}x${size}`);
}
