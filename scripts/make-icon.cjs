/**
 * Generates build/icon.png (512x512) for the desktop app — a gold drill descending into
 * dark soil. Pure Node (zlib only), no image deps. Run: node scripts/make-icon.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 512;
const buf = Buffer.alloc(S * S * 3);

function set(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S + x) * 3;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
}
function blend(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S + x) * 3;
  buf[i] = Math.round(buf[i] * (1 - a) + r * a);
  buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + g * a);
  buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + b * a);
}
function rect(x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, r, g, b);
}
function disc(cx, cy, rad, r, g, b) {
  for (let y = cy - rad; y <= cy + rad; y++)
    for (let x = cx - rad; x <= cx + rad; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rad) blend(x, y, r, g, b, Math.min(1, rad - d));
    }
}
// downward triangle (drill tip): apex at (cx, by), base at top y=ty spanning ±half
function triDown(cx, ty, by, half, r, g, b) {
  for (let y = ty; y <= by; y++) {
    const t = (y - ty) / (by - ty);
    const hw = half * (1 - t);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) set(x, y, r, g, b);
  }
}

// --- background: dark navy at top fading to brown soil at the bottom ---
for (let y = 0; y < S; y++) {
  const t = y / S;
  const r = Math.round(0x0a + (0x4a - 0x0a) * t * t);
  const g = Math.round(0x0a + (0x2e - 0x0a) * t * t);
  const b = Math.round(0x16 + (0x18 - 0x16) * t);
  for (let x = 0; x < S; x++) set(x, y, r, g, b);
}
// faint soil grid on the lower half
for (let gy = 300; gy < S; gy += 64) rect(0, gy, S, 2, 0x2a, 0x18, 0x10);
for (let gx = 32; gx < S; gx += 64) for (let y = 300; y < S; y++) blend(gx, y, 0x2a, 0x18, 0x10, 0.5);

const cx = 256;
// gold glow behind the pod
disc(cx, 230, 150, 0xff, 0xcf, 0x4d, 0); // (alpha via blend below)
for (let y = 90; y < 380; y++)
  for (let x = 110; x < 402; x++) {
    const d = Math.hypot(x - cx, y - 220);
    if (d < 150) blend(x, y, 0xff, 0xcf, 0x4d, 0.12 * (1 - d / 150));
  }

// pod body (rounded-ish gold block)
rect(cx - 90, 150, 180, 110, 0xf0, 0xc6, 0x3a);
rect(cx - 78, 158, 156, 40, 0xff, 0xe0, 0x66);
// cockpit
disc(cx, 196, 46, 0x12, 0x20, 0x2e);
disc(cx, 196, 36, 0x4f, 0xd0, 0xff);
disc(cx - 12, 184, 10, 0xd6, 0xf6, 0xff);

// drill shaft + tip (descending)
rect(cx - 34, 258, 68, 50, 0x8a, 0x93, 0xa0);
triDown(cx, 300, 430, 56, 0xcf, 0xd6, 0xdf);
triDown(cx, 300, 430, 36, 0x9a, 0xa3, 0xad);
// flutes
for (let i = 0; i < 3; i++) rect(cx - 30 + i, 320 + i * 34, 60 - i * 18, 4, 0x5a, 0x62, 0x6e);

// --- encode PNG (color type 2 = RGB) ---
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}
const CRC_TABLE = (() => {
  const tbl = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tbl[n] = c;
  }
  return tbl;
})();
function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return ~c;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
const raw = Buffer.alloc(S * (S * 3 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 3 + 1)] = 0; // filter: none
  buf.copy(raw, y * (S * 3 + 1) + 1, y * S * 3, (y + 1) * S * 3);
}
const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.png'), png);
console.log('Wrote build/icon.png (' + png.length + ' bytes)');
