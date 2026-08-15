/**
 * Generates one QR code per machine for booth signage and printed catalogues
 * (Part J.7).
 *
 *   npm run qr
 *
 * SVG rather than PNG: signage is printed at whatever size the stand needs, and
 * a raster QR that has been scaled up is a QR that fails under bad lighting at a
 * trade show, which is the one place it has to work.
 *
 * Error correction is set to M. Higher levels survive a scuffed banner but make
 * the pattern denser, and denser is harder to scan from three metres away across
 * an aisle — which is the actual failure mode here, not scuffing.
 *
 * The codes encode the short URL from lib/short-links, so they are derived from
 * the same place the redirect is. A printed code cannot drift from the route it
 * resolves to.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(root, 'public', 'qr');

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kaoming.com').replace(/\/$/, '');

/**
 * `seriesSlug` from lib/taxonomy, and `shortCodeFor` from lib/short-links.
 *
 * Restated here because this is plain Node and those are TypeScript modules
 * behind path aliases. Restating a rule is how printed codes drift from the
 * routes they resolve to, so `tests/m6-smoke.py` scans every generated code and
 * follows it: if these two ever disagree with the app, the gate fails rather
 * than a banner does.
 */
function seriesSlug(name) {
  const [codes] = name.split('—');
  return codes
    .trim()
    .toLowerCase()
    .split('/')
    .map((code, index) => {
      const clean = code.trim().replace(/[^a-z0-9-]+/g, '');
      return index === 0 ? clean : clean.replace(/^kmc-/, '');
    })
    .join('-');
}

/**
 * The categories that have a 2026 catalogue. The website-only category has no
 * catalogue behind it and no product route, so it gets no printed code — see
 * `CATALOGUE_CATEGORY_IDS` in lib/taxonomy.
 */
const CATALOGUE_CATEGORY_IDS = [
  'gantry-machining-center',
  'double-column-machining-center',
  'multi-face-machining-center',
  'vertical-machining-center',
];

async function machines() {
  const taxonomy = JSON.parse(
    await readFile(join(root, 'content', 'machines', '_taxonomy.json'), 'utf8'),
  );

  return taxonomy.categories
    .filter((category) => CATALOGUE_CATEGORY_IDS.includes(category.id))
    .flatMap((category) =>
      category.series.map((series) => {
        const slug = seriesSlug(series.name_2026);
        return { slug, code: slug.replace(/^kmc-/, ''), name: series.name_2026 };
      }),
    );
}

const list = await machines();
await mkdir(outputDirectory, { recursive: true });

const index = [];

for (const machine of list) {
  const url = `${SITE_URL}/m/${machine.code}`;
  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#0c0b0a', light: '#ffffff' },
  });

  const file = join(outputDirectory, `${machine.code}.svg`);
  await writeFile(file, svg, 'utf8');
  index.push({ code: machine.code, slug: machine.slug, name: machine.name, url });
  console.log(`  ${machine.code.padEnd(8)} ${url}`);
}

await writeFile(
  join(outputDirectory, 'index.json'),
  `${JSON.stringify({ generatedFrom: SITE_URL, codes: index }, null, 2)}\n`,
  'utf8',
);

console.log(`\n${list.length} QR codes written to public/qr/`);
