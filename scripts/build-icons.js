/**
 * 네이티브 모듈 없이(pngjs + to-ico + png2icons) 앱 아이콘 생성.
 * 실행: npm run build:icons
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const toIco = require('to-ico');
const png2icons = require('png2icons');

const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets');

function setPx(png, x, y, r, g, b, a = 255) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= png.width || yi >= png.height) return;
  const i = (png.width * yi + xi) << 2;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * Math.min(1, Math.max(0, t)));
}

function fillCircle(png, cx, cy, R, r, g, b, a = 255) {
  const R2 = R * R;
  const x0 = Math.max(0, Math.floor(cx - R - 1));
  const x1 = Math.min(png.width - 1, Math.ceil(cx + R + 1));
  const y0 = Math.max(0, Math.floor(cy - R - 1));
  const y1 = Math.min(png.height - 1, Math.ceil(cy + R + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d2 <= R2) setPx(png, x, y, r, g, b, a);
    }
  }
}

function stampSoftCircle(png, cx, cy, R, r, g, b) {
  const outer = R + 1.5;
  const x0 = Math.max(0, Math.floor(cx - outer));
  const x1 = Math.min(png.width - 1, Math.ceil(cx + outer));
  const y0 = Math.max(0, Math.floor(cy - outer));
  const y1 = Math.min(png.height - 1, Math.ceil(cy + outer));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = dist(x, y, cx, cy);
      if (d > outer) continue;
      const edge = Math.min(1, Math.max(0, (R + 1 - d) / 2));
      if (edge <= 0) continue;
      const i = (png.width * y + x) << 2;
      const a = Math.round(255 * edge);
      const ba = png.data[i + 3] / 255;
      const na = a / 255 + ba * (1 - a / 255);
      if (na <= 0.001) continue;
      const inv = 1 / na;
      png.data[i] = Math.round((r * (a / 255) + png.data[i] * ba * (1 - a / 255)) * inv);
      png.data[i + 1] = Math.round((g * (a / 255) + png.data[i + 1] * ba * (1 - a / 255)) * inv);
      png.data[i + 2] = Math.round((b * (a / 255) + png.data[i + 2] * ba * (1 - a / 255)) * inv);
      png.data[i + 3] = Math.round(255 * na);
    }
  }
}

/** 256×256 디자인 좌표 → 임의 크기 PNG (HANDOFF 뷰박스와 유사) */
function drawAppIcon(size) {
  const png = new PNG({ width: size, height: size });
  const k = size / 256;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ty = y / Math.max(1, size - 1);
      const br = lerp(0xf3, 0xff, ty);
      const bg = lerp(0xe8, 0xff, ty);
      const bb = lerp(0xff, 0xff, ty);
      const i = (size * y + x) << 2;
      png.data[i] = br;
      png.data[i + 1] = bg;
      png.data[i + 2] = bb;
      png.data[i + 3] = 255;
    }
  }

  const cx = 128 * k;
  const cy = 130 * k;
  const bodyR = 82 * k;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = dist(x, y, cx, cy);
      if (d >= bodyR) continue;
      const t = d / bodyR;
      const pr = lerp(0xff, 0xff, t * t);
      const pg = lerp(0xd9, 0xab, t);
      const pb = lerp(0xec, 0xd0, t);
      setPx(png, x, y, pr, pg, pb, 255);
    }
  }

  const outline = 1.2 * k;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = dist(x, y, cx, cy);
      if (d >= bodyR - outline && d < bodyR) {
        setPx(png, x, y, 0xff, 0x9e, 0xc8, 255);
      }
    }
  }

  const ex1 = 108 * k;
  const ex2 = 148 * k;
  const eyeY = 118 * k;
  const eyeRx = 9 * k;
  const eyeRy = 11 * k;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d1 = ((x - ex1) * (x - ex1)) / (eyeRx * eyeRx) + ((y - eyeY) * (y - eyeY)) / (eyeRy * eyeRy);
      const d2 = ((x - ex2) * (x - ex2)) / (eyeRx * eyeRx) + ((y - eyeY) * (y - eyeY)) / (eyeRy * eyeRy);
      if (d1 <= 1 || d2 <= 1) setPx(png, x, y, 0x3d, 0x2d, 0x45, 255);
    }
  }

  fillCircle(png, 110 * k, 114 * k, Math.max(1, 3 * k), 0xff, 0xff, 0xff, 220);
  fillCircle(png, 150 * k, 114 * k, Math.max(1, 3 * k), 0xff, 0xff, 0xff, 220);

  const mouthY = 138 * k;
  for (let t = 0; t <= 20; t++) {
    const u = t / 20;
    const mx = lerp(118 * k, 138 * k, u);
    const my = mouthY + Math.sin(u * Math.PI) * (10 * k);
    stampSoftCircle(png, mx, my, Math.max(1, 2 * k), 0xc9, 0x4d, 0x7a);
  }

  const bandCx = 128 * k;
  const bandCy = 70 * k;
  const bandRx = 78 * k;
  const bandRy = 22 * k;
  for (let a = Math.PI * 0.08; a <= Math.PI * 0.92; a += 0.02) {
    const bx = bandCx + bandRx * Math.cos(a + Math.PI);
    const by = bandCy + bandRy * Math.sin(a + Math.PI);
    stampSoftCircle(png, bx, by, Math.max(1, 7 * k), 0x1a, 0x1a, 0x1a);
  }

  const cupW = 16 * k;
  const cupH = 52 * k;
  const lx = 44 * k;
  const rx = 212 * k;
  const cupTop = 100 * k;
  for (let dy = 0; dy < cupH; dy++) {
    for (let dx = 0; dx < cupW; dx++) {
      const px = lx - cupW / 2 + dx;
      const py = cupTop + dy;
      setPx(png, px, py, 0x3a, 0x3a, 0x3a, 255);
      setPx(png, rx - cupW / 2 + dx, py, 0x3a, 0x3a, 0x3a, 255);
    }
  }
  const edgeW = Math.max(1, 3 * k);
  for (let dy = 0; dy < cupH; dy++) {
    for (let dx = 0; dx < edgeW; dx++) {
      setPx(png, lx - cupW / 2 - dx, cupTop + dy, 0x1a, 0x1a, 0x1a, 255);
      setPx(png, rx + cupW / 2 + dx, cupTop + dy, 0x1a, 0x1a, 0x1a, 255);
    }
  }

  return png;
}

function drawTrayIcon(size) {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 0;
  }
  const k = size / 32;
  const cx = 16 * k;
  const cy = 18 * k;
  const R = 11 * k;
  fillCircle(png, cx, cy, R, 0, 0, 0, 255);
  fillCircle(png, 12 * k, 16.5 * k, Math.max(0.8, 1.2 * k), 255, 255, 255, 200);
  fillCircle(png, 20 * k, 16.5 * k, Math.max(0.8, 1.2 * k), 255, 255, 255, 200);
  for (let a = Math.PI * 0.15; a <= Math.PI * 0.85; a += 0.08) {
    const bx = cx + 14 * k * Math.cos(a + Math.PI);
    const by = 10 * k + 4 * k * Math.sin(a + Math.PI);
    stampSoftCircle(png, bx, by, Math.max(1, 2 * k), 0, 0, 0);
  }
  const h = 8 * k;
  const w = Math.max(1, 3 * k);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPx(png, 2 * k + dx, 13 * k + dy, 0, 0, 0, 255);
      setPx(png, 27 * k + dx, 13 * k + dy, 0, 0, 0, 255);
    }
  }
  return png;
}

function scaleNearest(srcPng, nw, nh) {
  const dst = new PNG({ width: nw, height: nh });
  for (let y = 0; y < nh; y++) {
    const sy = Math.min(srcPng.height - 1, Math.floor((y * srcPng.height) / nh));
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(srcPng.width - 1, Math.floor((x * srcPng.width) / nw));
      const si = (srcPng.width * sy + sx) << 2;
      const di = (nw * y + x) << 2;
      dst.data[di] = srcPng.data[si];
      dst.data[di + 1] = srcPng.data[si + 1];
      dst.data[di + 2] = srcPng.data[si + 2];
      dst.data[di + 3] = srcPng.data[si + 3];
    }
  }
  return dst;
}

async function main() {
  const master = drawAppIcon(1024);
  const png1024 = PNG.sync.write(master);
  fs.writeFileSync(path.join(assets, 'icon.png'), png1024);
  console.log('Wrote assets/icon.png');

  const sizes = [256, 128, 64, 48, 32, 16];
  const buffers = sizes.map((sz) => PNG.sync.write(scaleNearest(master, sz, sz)));
  const icoBuf = await toIco(buffers);
  fs.writeFileSync(path.join(assets, 'icon.ico'), icoBuf);
  console.log('Wrote assets/icon.ico');

  const icnsBuf = png2icons.createICNS(png1024, png2icons.BILINEAR, 0);
  if (!icnsBuf) {
    console.error('ICNS 생성 실패 (png2icons)');
    process.exit(1);
  }
  fs.writeFileSync(path.join(assets, 'icon.icns'), icnsBuf);
  console.log('Wrote assets/icon.icns');

  const tray = drawTrayIcon(32);
  fs.writeFileSync(path.join(assets, 'tray-icon.png'), PNG.sync.write(tray));
  console.log('Wrote assets/tray-icon.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
