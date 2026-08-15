import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifySales } from '@/lib/rfq/notify';
import { checkRateLimit, clientAddress } from '@/lib/rfq/rate-limit';
import {
  fieldErrorsOf,
  isAcceptedUpload,
  MAX_FILE_BYTES,
  MAX_FILES,
  MIN_ELAPSED_MS,
  rfqSchema,
  safeFilename,
} from '@/lib/rfq/schema';

/**
 * POST /api/rfq — the most important function on the site (Part M.1).
 *
 * Order matters. Cheap rejections first (rate limit, honeypot, time trap), then
 * validation, then files, then the write, then the notification. The lead is
 * committed before anyone tries to send mail, so a mail outage can never lose an
 * enquiry — see lib/rfq/notify.
 *
 * Everything arriving here is untrusted, including the parts the form already
 * checked. The payload is parsed again from scratch against the same schema.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = process.env.RFQ_UPLOAD_DIR ?? '.uploads';

type StoredFile = {
  originalName: string;
  storedPath: string;
  byteSize: number;
  mimeType: string;
  sha256: string;
};

/** Uploads land outside `public/`, so nothing here is ever served over HTTP. */
async function storeUploads(files: File[], leadRef: string): Promise<StoredFile[]> {
  if (!files.length) return [];

  const directory = path.resolve(process.cwd(), UPLOAD_DIR, leadRef);
  const root = path.resolve(process.cwd(), UPLOAD_DIR);
  if (!directory.startsWith(root + path.sep)) {
    throw new Error('upload path escaped the upload directory');
  }
  await mkdir(directory, { recursive: true });

  const stored: StoredFile[] = [];
  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    // Re-check the size against the bytes actually received, not the claim.
    if (bytes.byteLength > MAX_FILE_BYTES) continue;

    const name = safeFilename(file.name);
    const target = path.join(directory, `${randomUUID().slice(0, 8)}-${name}`);
    await writeFile(target, bytes);

    stored.push({
      originalName: name,
      storedPath: path.relative(process.cwd(), target),
      byteSize: bytes.byteLength,
      mimeType: file.type || 'application/octet-stream',
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return stored;
}

/** The machine selection arrives as JSON in a form field, so it can be malformed. */
function parseMachines(value: FormDataEntryValue | null): unknown {
  if (typeof value !== 'string' || !value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const limit = checkRateLimit(clientAddress(request.headers));
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const raw = {
    company: form.get('company'),
    name: form.get('name'),
    email: form.get('email'),
    phone: form.get('phone'),
    country: form.get('country'),
    industry: form.get('industry'),
    application: form.get('application'),
    material: form.get('material'),
    workpieceSize: form.get('workpieceSize'),
    expectedProduction: form.get('expectedProduction'),
    message: form.get('message'),
    consent: form.get('consent') === 'true',
    locale: form.get('locale') ?? 'en',
    source: form.get('source') ?? 'rfq',
    website: form.get('website') ?? '',
    elapsedMs: form.get('elapsedMs') ?? 0,
    machines: parseMachines(form.get('machines')),
  };

  // A filled honeypot and an impossibly fast submission are both bots. Answer
  // exactly what a success looks like, so they learn nothing, and store nothing.
  if (raw.website || Number(raw.elapsedMs) < MIN_ELAPSED_MS) {
    return NextResponse.json({ ok: true, id: null });
  }

  const parsed = rfqSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid', fields: fieldErrorsOf(parsed.error) },
      { status: 422 },
    );
  }

  const lead = parsed.data;

  const uploads = form
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, MAX_FILES)
    .filter((file) => file.size <= MAX_FILE_BYTES && isAcceptedUpload(file.name, file.type));

  const leadRef = randomUUID();

  let stored: StoredFile[] = [];
  try {
    stored = await storeUploads(uploads, leadRef);
  } catch (error) {
    console.error('[rfq] upload failed', error);
    // An enquiry is worth more than its attachments: keep going without them
    // and let sales ask for the drawing by reply.
  }

  let id: string;
  try {
    const created = await prisma.lead.create({
      data: {
        locale: lead.locale,
        source: lead.source,
        company: lead.company,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        country: lead.country,
        industry: lead.industry,
        application: lead.application,
        material: lead.material,
        workpieceSize: lead.workpieceSize,
        expectedProduction: lead.expectedProduction,
        message: lead.message,
        consentAt: new Date(),
        machines: { create: lead.machines },
        files: { create: stored },
      },
      select: { id: true },
    });
    id = created.id;
  } catch (error) {
    console.error('[rfq] could not store lead', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }

  const notified = await notifySales(lead, { id, files: stored });

  return NextResponse.json({ ok: true, id, notified: notified.status });
}
