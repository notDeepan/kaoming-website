/**
 * Prepares the kit's imagery for the web.
 *
 *   node scripts/prepare-images.mjs [--kit <path to kaoming-website-kit>]
 *
 * Every machine render in the kit is a studio plate on pure white. The site is a
 * dark machine hall, so each render is also published as a knockout: the white
 * background is removed and the machine sits directly on the page's black field,
 * lit from below by a CSS pool of light. That is the art direction in Part B.1 —
 * "one monumental machine at a time occupies the light" — and it is the only way
 * these assets can carry it.
 *
 * The knockout is a background removal, not a retouch: no pixel of the machine
 * is altered, and the untouched plate is published alongside for light contexts
 * and galleries.
 *
 * Outputs
 *   public/img/machines/<name>.jpg        studio plate, max 2000px
 *   public/img/machines/<name>-cut.webp   knockout with alpha, max 2000px
 *   public/img/factory/<name>.jpg         factory photography, max 2000px
 *   public/docs/<name>.pdf                the 2026 catalogues
 *   content/images/generated.json         dimensions + provenance for the loader
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const argKit = process.argv.indexOf('--kit');
const KIT =
  argKit > -1
    ? process.argv[argKit + 1]
    : path.resolve('..', 'kaoming-website-kit-FINAL', 'kaoming-website-kit');

const MAX_WIDTH = 2000;

if (!existsSync(KIT)) {
  console.error(`Kit not found at ${KIT}. Pass --kit <path>.`);
  process.exit(1);
}

const ensure = (dir) => mkdirSync(dir, { recursive: true });
ensure('public/img/machines');
ensure('public/img/factory');
ensure('public/docs');
ensure('content/images');

/**
 * Removes the studio background.
 *
 * Pass 1 floods inward from the frame edge, so the machine's own white panels —
 * enclosed, never reachable from outside — survive.
 * Pass 2 clears background visible through the machine's gaps, which pass 1
 * cannot reach. A blown-out work lamp is flat white too, so a region is only
 * cleared when the pixels bounding it are dark; a highlight is ringed by its own
 * halo and stays.
 */
async function knockout(src, { threshold = 250 } = {}) {
  const resized = sharp(src).resize({ width: MAX_WIDTH, withoutEnlargement: true }).removeAlpha();
  const png = await resized.clone().png().toBuffer();
  const { data, info } = await resized.clone().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;

  const flat = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * channels;
    const min = Math.min(data[p], data[p + 1], data[p + 2]);
    const max = Math.max(data[p], data[p + 1], data[p + 2]);
    flat[i] = min >= threshold && max - min <= 3 ? 1 : 0;
  }

  const bg = new Uint8Array(w * h);
  const fill = (seeds, mark) => {
    const stack = seeds.slice();
    const cells = [];
    while (stack.length) {
      const i = stack.pop();
      if (bg[i] || !flat[i]) continue;
      bg[i] = mark;
      cells.push(i);
      const x = i % w;
      const y = (i - x) / w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - w);
      if (y < h - 1) stack.push(i + w);
    }
    return cells;
  };

  const border = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  fill(border, 1);

  const MIN_ENCLOSED = Math.max(120, Math.round(w * h * 0.00004));
  const lum = (i) => {
    const p = i * channels;
    return 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  };

  for (let i = 0; i < w * h; i++) {
    if (bg[i] || !flat[i]) continue;
    const cells = fill([i], 2);
    let ringSum = 0;
    let ringCount = 0;
    for (const c of cells) {
      const x = c % w;
      const y = (c - x) / w;
      const neighbours = [
        x > 0 ? c - 1 : -1,
        x < w - 1 ? c + 1 : -1,
        y > 0 ? c - w : -1,
        y < h - 1 ? c + w : -1,
      ];
      for (const n of neighbours) {
        if (n < 0 || flat[n]) continue;
        ringSum += lum(n);
        ringCount++;
      }
    }
    const ringMean = ringCount ? ringSum / ringCount : 0;
    if (cells.length < MIN_ENCLOSED || ringMean > 190) {
      for (const c of cells) bg[c] = 0;
    }
  }

  const mask = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const keep = bg[i] ? 0 : 255;
    mask[i * 4] = 255;
    mask[i * 4 + 1] = 255;
    mask[i * 4 + 2] = 255;
    mask[i * 4 + 3] = keep;
  }
  // A one-pixel feather stops the silhouette reading as a cut-out sticker.
  const softMask = await sharp(mask, { raw: { width: w, height: h, channels: 4 } })
    .blur(0.6)
    .png()
    .toBuffer();

  const buffer = await sharp(png)
    .ensureAlpha()
    .composite([{ input: softMask, blend: 'dest-in' }])
    .webp({ quality: 86, alphaQuality: 92, effort: 5 })
    .toBuffer();

  return { buffer, width: w, height: h };
}

const manifest = JSON.parse(readFileSync(path.join(KIT, 'images', '_manifest.json'), 'utf8'));
const generated = { note: manifest.note, series: {}, factory: [], documents: [] };

for (const [seriesLabel, entry] of Object.entries(manifest.series)) {
  const records = [];

  for (const image of entry.images) {
    const src = path.join(KIT, entry.folder, image.file);
    if (!existsSync(src)) {
      console.warn(`  missing ${image.file}`);
      continue;
    }
    const stem = image.file.replace(/\.[^.]+$/, '');

    const plate = await sharp(src)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    writeFileSync(`public/img/machines/${stem}.jpg`, plate.data);

    const cut = await knockout(src);
    writeFileSync(`public/img/machines/${stem}-cut.webp`, cut.buffer);

    records.push({
      model: image.model,
      view: image.view,
      bestFor: image.best_for,
      plate: {
        src: `/img/machines/${stem}.jpg`,
        width: plate.info.width,
        height: plate.info.height,
      },
      cut: { src: `/img/machines/${stem}-cut.webp`, width: cut.width, height: cut.height },
    });
    console.log(`  ${stem} ${plate.info.width}x${plate.info.height}`);
  }

  generated.series[seriesLabel] = { folder: entry.folder, warning: entry.WARNING ?? null, images: records };
}

/**
 * Factory photography — no knockout, these are real photographs of the plant.
 *
 * Part J.2 is explicit: real photography only, and AI may grade or clean up but
 * must never fabricate or misrepresent the facility. So this list is exactly the
 * files whose subject is identifiable from the kit, and nothing else. The four
 * `factory-slide-07..10` files are not here: their subject cannot be determined
 * from the archive, and a caption guessed onto a photograph of somebody's
 * factory is a misrepresentation even when the photograph is genuine.
 */
const FACTORY = [
  'kaoming-factory-01-machining-hall-overhead-crane.jpg',
  'kaoming-factory-02-ctsp-plant-exterior.jpg',
  'kaoming-factory-03-original-hq-fengyuan.jpg',
  'kaoming-factory-04-heritage-kaoming-gate.jpg',
  'kaoming-factory-05-lobby-showroom-interior.jpg',
  'kaoming-factory-06-parts-inventory-racks.jpg',
  'kaoming-factory-07-inventory-warehouse.jpg',
  'kaoming-factory-08-warehouse-aisle.jpg',
  'kaoming-factory-09-worktable-detail-a.jpg',
  'kaoming-factory-10-worktable-detail-b.jpg',
  'shopfloor-168CE-assembly.jpg',
  'shopfloor-168CE-packed-for-shipping.jpg',
];

for (const file of FACTORY) {
  const src = path.join(KIT, 'factory', file);
  if (!existsSync(src)) {
    console.warn(`  missing factory/${file}`);
    continue;
  }
  const out = await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const stem = file.replace(/\.[^.]+$/, '');
  writeFileSync(`public/img/factory/${stem}.jpg`, out.data);
  generated.factory.push({
    src: `/img/factory/${stem}.jpg`,
    width: out.info.width,
    height: out.info.height,
  });
  console.log(`  factory/${stem} ${out.info.width}x${out.info.height}`);
}

// The three 2026 catalogues, served as downloads (Part N.3 / Scene 10).
const CATALOGUES = [
  {
    file: 'KMC-GN-GM-Gantry-Series-2026-EN.pdf',
    id: 'cat-gn-gm-2026-en',
    covers: ['kmc-gm', 'kmc-gn'],
  },
  {
    file: 'KMC-Bow-Way-Hephaestus-Minerva-2026-EN.pdf',
    id: 'cat-bow-way-2026-en',
    covers: ['kmc-h7-h8', 'kmc-h11', 'kmc-ha11', 'kmc-ha14', 'kmc-hma'],
  },
  {
    file: 'KMC-CE-CH-Clymene-Vertical-2026-EN.pdf',
    id: 'cat-clymene-2026-en',
    covers: ['kmc-ce', 'kmc-ch'],
  },
];

for (const doc of CATALOGUES) {
  const src = path.join(KIT, 'catalogues', doc.file);
  if (!existsSync(src)) {
    console.warn(`  missing catalogues/${doc.file}`);
    continue;
  }
  copyFileSync(src, `public/docs/${doc.file}`);
  const bytes = statSync(src).size;
  generated.documents.push({
    id: doc.id,
    path: `/docs/${doc.file}`,
    fileType: 'PDF',
    sizeBytes: bytes,
    language: 'en',
    version: '2026',
    covers: doc.covers,
    sha256: createHash('sha256').update(readFileSync(src)).digest('hex').slice(0, 16),
  });
  console.log(`  docs/${doc.file} ${(bytes / 1048576).toFixed(1)}MB`);
}

writeFileSync('content/images/generated.json', JSON.stringify(generated, null, 2));
console.log('\nwrote content/images/generated.json');
