import sharp from 'sharp';

// The supplied CIS mark, unmodified, centred on a --km-paper square.
// Placement only — no crop, no redraw, no recolour (CLAUDE.md).
const SRC = 'public/brand/KMC_CIS_Final_20240108_LOGO.png';
const PAPER = { r: 0xfa, g: 0xf9, b: 0xf6, alpha: 1 };

async function make(size, out) {
  const inner = Math.round(size * 0.82);
  const mark = await sharp(SRC).resize({ height: inner, fit: 'inside' }).png().toBuffer();
  const meta = await sharp(mark).metadata();
  await sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([
      {
        input: mark,
        top: Math.round((size - meta.height) / 2),
        left: Math.round((size - meta.width) / 2),
      },
    ])
    .png()
    .toFile(out);
  console.log(out, size);
}

// 96px keeps the favicon a few KB. A 512px icon costs ~67 KB on every page load
// for a 16px tab affordance; apple-icon.png covers the large-icon cases.
await make(96, 'app/icon.png');
await make(180, 'app/apple-icon.png');
