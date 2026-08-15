/**
 * Checks the site can actually run, before you are standing in front of anyone.
 *
 *   npm run demo     preflight, then build, then serve
 *   npm run check    preflight only
 *
 * The failure this exists to prevent is specific. Generated assets — machine
 * plates, catalogue spreads, the PDFs — are produced from the source kit by
 * scripts and are deliberately not in git (116 MB of them). A fresh clone
 * therefore builds and serves perfectly while rendering a site with no
 * machines on it, and you find out when the projector is on.
 *
 * Every check below names the exact command that fixes it.
 */

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

/** A directory that must exist and must not be empty. */
function needsFiles(path, label, fix) {
  const full = join(root, path);
  const count = existsSync(full) ? readdirSync(full).length : 0;
  if (count === 0) problems.push({ label, fix, detail: `${path} is empty or missing` });
  return count;
}

// --- Dependencies.
if (!existsSync(join(root, 'node_modules'))) {
  problems.push({
    label: 'Dependencies are not installed',
    fix: 'npm install',
    detail: 'node_modules is missing',
  });
}

// --- The kit. Only needed to *regenerate* assets, so this is a warning, not a
//     failure: a machine that already has the generated output does not need it.
const kit = join(root, '..', 'kaoming-website-kit-FINAL', 'kaoming-website-kit');
const hasKit = existsSync(kit);

// --- Generated assets, in the order a visitor would notice them missing.
const machines = needsFiles(
  'public/img/machines',
  'No machine photography',
  'node scripts/prepare-images.mjs',
);
const spreads = needsFiles(
  'public/catalogue',
  'No catalogue spreads',
  'python scripts/rasterize-catalogues.py',
);
const docs = needsFiles('public/docs', 'No catalogue PDFs', 'node scripts/prepare-images.mjs');
needsFiles('public/qr', 'No QR codes', 'npm run qr');
needsFiles('public/fonts', 'No fonts', 'the fonts are committed — check the clone');

// --- The lead store. The RFQ path is the point of the site; a demo that
//     submits an enquiry and errors is worse than one that does not try.
if (!existsSync(join(root, 'prisma')) ) {
  problems.push({ label: 'Prisma schema missing', fix: 'check the clone', detail: 'prisma/' });
} else if (!existsSync(join(root, 'dev.db')) && !existsSync(join(root, 'prisma', 'dev.db'))) {
  problems.push({
    label: 'No database — submitting an enquiry will fail',
    fix: 'npm run db:migrate',
    detail: 'dev.db not found',
  });
}

// ----------------------------------------------------------------- report
const ok = (label, detail) => console.log(`  ok    ${label.padEnd(34)} ${detail}`);

console.log('\nKAO MING — preflight\n');

if (machines) ok('machine photography', `${machines} files`);
if (spreads) ok('catalogue spreads', `${spreads} documents`);
if (docs) ok('catalogue PDFs', `${docs} files`);
console.log(`  ${hasKit ? 'ok   ' : 'note '} source kit${' '.repeat(24)}${hasKit ? 'present' : 'absent — fine unless you need to regenerate assets'}`);

if (!problems.length) {
  console.log('\nReady. `npm run demo` builds and serves on http://localhost:3000/en\n');
  process.exit(0);
}

console.log('\nNot ready:\n');
for (const problem of problems) {
  console.log(`  ✗ ${problem.label}`);
  console.log(`      ${problem.detail}`);
  console.log(`      fix:  ${problem.fix}`);
}

if (!hasKit && problems.some((p) => p.fix.includes('scripts/'))) {
  console.log(
    '\n  The asset scripts read `kaoming-website-kit-FINAL/` next to this folder.',
  );
  console.log('  It is not in git (135 MB). Copy it in before regenerating.\n');
} else {
  console.log('');
}

process.exit(1);
