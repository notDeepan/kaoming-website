/**
 * Regenerates public/fonts/noto-sans-tc-v<VERSION>/faces.css from the Noto Sans
 * TC files in that directory and the unicode-ranges published by
 * @fontsource-variable/noto-sans-tc.
 *
 * Usage:
 *   npm i --no-save @fontsource-variable/noto-sans-tc
 *   node scripts/generate-cjk-faces.mjs
 *
 * Only needed when the font version changes. Bump VERSION here, rename the
 * directory under public/fonts/, and re-run — the versioned path is what makes
 * the immutable cache header on /fonts/* safe.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const VERSION = '5.3.0';
const SOURCE_CSS = `node_modules/@fontsource-variable/noto-sans-tc/index.css`;
const PUBLIC_DIR = `/fonts/noto-sans-tc-v${VERSION}`;
const OUT = `public${PUBLIC_DIR}/faces.css`;

const source = readFileSync(SOURCE_CSS, 'utf8');
const blocks = [...source.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1]);

const faces = blocks.map((block) => {
  const file = /url\(\.\/files\/([^)]+)\)/.exec(block)[1];
  const range = /unicode-range:\s*([^;]+);/.exec(block)[1].trim();
  return (
    `@font-face{font-family:'Noto Sans TC Variable';font-style:normal;` +
    `font-display:swap;font-weight:100 900;` +
    `src:url('${PUBLIC_DIR}/${file}') format('woff2-variations');` +
    `unicode-range:${range}}`
  );
});

const header = [
  '/* GENERATED — do not hand-edit. Run scripts/generate-cjk-faces.mjs.',
  '',
  `   ${faces.length} unicode-range @font-face rules for Noto Sans TC. Linked by the`,
  '   locale layout on zh-tw only.',
  '',
  '   This is the SAFETY NET, not the first choice: the font stacks in',
  '   lib/fonts/index.ts and app/globals.css name the platform CJK faces',
  '   (PingFang TC, Noto Sans CJK TC, Microsoft JhengHei) ahead of it. Fallback',
  '   is resolved per glyph, so a device missing a Traditional Chinese glyph',
  '   downloads just the subset that carries it and nothing else.',
  '',
  `   Font files: public/fonts/noto-sans-tc-v${VERSION}/ (SIL OFL 1.1). */`,
  '',
].join('\n');

writeFileSync(OUT, header + faces.join('\n') + '\n', 'utf8');
console.log(`wrote ${OUT}: ${faces.length} faces`);
