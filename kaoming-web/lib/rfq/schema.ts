import { z } from 'zod';

/**
 * The RFQ contract, defined once and enforced on both sides (Part M.1).
 *
 * The client uses it to show errors as the visitor types; the server uses it to
 * decide what is real. The server never trusts the client's verdict — it parses
 * the payload again from scratch — but they cannot disagree about the rules,
 * because there is only one copy of them.
 */

/** Where the enquiry started. Sales reads this to know what the visitor saw. */
export const RFQ_SOURCES = ['rfq', 'product', 'compare', 'contact', 'header', 'catalogue'] as const;
export type RfqSource = (typeof RFQ_SOURCES)[number];

/**
 * Upload whitelist from Part M.1. Extension and MIME type must BOTH be
 * acceptable: an extension is a claim by the uploader, and a MIME type is a
 * claim by the browser, so neither is trusted alone.
 */
export const UPLOAD_EXTENSIONS = [
  'pdf',
  'step',
  'stp',
  'iges',
  'igs',
  'dwg',
  'dxf',
  'jpg',
  'jpeg',
  'png',
  'zip',
] as const;

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 3;

/** CAD formats have no registered MIME type, so browsers send them as one of these. */
const GENERIC_BINARY = ['application/octet-stream', 'application/x-zip-compressed', ''];

const MIME_BY_EXTENSION: Record<string, string[]> = {
  pdf: ['application/pdf'],
  step: GENERIC_BINARY, stp: GENERIC_BINARY,
  iges: GENERIC_BINARY, igs: GENERIC_BINARY,
  dwg: ['image/vnd.dwg', 'application/acad', ...GENERIC_BINARY],
  dxf: ['image/vnd.dxf', 'application/dxf', ...GENERIC_BINARY],
  jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'],
  zip: ['application/zip', ...GENERIC_BINARY],
};

export function extensionOf(filename: string): string {
  return filename.toLowerCase().split('.').pop() ?? '';
}

export function isAcceptedUpload(filename: string, mimeType: string): boolean {
  const extension = extensionOf(filename);
  const allowed = MIME_BY_EXTENSION[extension];
  return Boolean(allowed) && allowed.includes(mimeType.toLowerCase());
}

/**
 * Strips any directory component and anything that is not a safe filename
 * character. An uploaded name is attacker-controlled text, never a path.
 */
export function safeFilename(filename: string): string {
  const base = filename.replace(/\\/g, '/').split('/').pop() ?? 'upload';
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '');
  return cleaned.slice(0, 120) || 'upload';
}

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const machineSelectionSchema = z.object({
  seriesSlug: z.string().trim().min(1).max(64),
  seriesName: z.string().trim().min(1).max(120),
  model: z.string().trim().max(64).optional(),
});

export const rfqSchema = z.object({
  // --- step 1: who is asking
  company: requiredText(160),
  name: requiredText(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: optionalText(60),
  country: requiredText(80),

  // --- step 2: what they need
  machines: z.array(machineSelectionSchema).max(10).default([]),
  industry: optionalText(80),
  application: optionalText(200),
  material: optionalText(120),
  workpieceSize: optionalText(120),
  expectedProduction: optionalText(120),
  message: optionalText(4000),

  // --- consent and provenance
  consent: z.literal(true),
  locale: z.string().trim().max(12),
  source: z.enum(RFQ_SOURCES).default('rfq'),

  // --- spam traps, never shown to a person
  /** Honeypot: a real visitor cannot type into a field they cannot see. */
  website: z.string().max(0).optional().or(z.literal('')),
  /** Milliseconds the form was open. Bots submit far faster than people read. */
  elapsedMs: z.coerce.number().int().nonnegative().optional(),
});

export type RfqInput = z.input<typeof rfqSchema>;
export type RfqPayload = z.output<typeof rfqSchema>;

/** A form filled in under this many milliseconds was not filled in by a person. */
export const MIN_ELAPSED_MS = 3000;

export type RfqFieldErrors = Partial<Record<keyof RfqPayload, string>>;

/** Flattens a zod error into one message per field, which is what the UI shows. */
export function fieldErrorsOf(error: z.ZodError): RfqFieldErrors {
  const errors: RfqFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof RfqPayload | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
