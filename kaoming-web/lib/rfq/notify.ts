import 'server-only';
import type { RfqPayload } from './schema';

/**
 * RFQ notification to sales.
 *
 * The recipient inbox is an open decision (Appendix 2, due M2 — sales' call), so
 * this is deliberately built to be honest about not being configured rather than
 * to look like it worked. If there is no inbox or no API key, the lead is still
 * stored and the notification is logged in full, so nothing is lost and the gap
 * is visible in the server output instead of hiding until launch day.
 *
 * Delivery never fails the request: the enquiry is already committed by the time
 * this runs, and telling a buyer their enquiry failed because our mail provider
 * was down would be a lie.
 */

export type NotifyResult =
  | { status: 'sent'; to: string[] }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

function recipients(): string[] {
  return (process.env.RFQ_NOTIFY_TO ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
}

export function renderLeadSummary(
  lead: RfqPayload,
  extra: { id: string; files: { originalName: string; byteSize: number }[] },
): { subject: string; text: string } {
  const machines = lead.machines.length
    ? lead.machines.map((m) => `${m.seriesName}${m.model ? ` (${m.model})` : ''}`).join(', ')
    : '—';

  const rows: [string, string | undefined][] = [
    ['Machines', machines],
    ['Company', lead.company],
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Country', lead.country],
    ['Industry', lead.industry],
    ['Application', lead.application],
    ['Material', lead.material],
    ['Workpiece size', lead.workpieceSize],
    ['Expected production', lead.expectedProduction],
    ['Language', lead.locale],
    ['Came from', lead.source],
    [
      'Files',
      extra.files.length
        ? extra.files
            .map((f) => `${f.originalName} (${(f.byteSize / 1024 / 1024).toFixed(1)} MB)`)
            .join(', ')
        : '—',
    ],
  ];

  const body = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label.padEnd(20)} ${value}`)
    .join('\n');

  return {
    subject: `RFQ — ${lead.company} (${lead.country}) — ${machines}`,
    text: `${body}\n\nMessage\n${'-'.repeat(60)}\n${lead.message ?? '—'}\n\nLead ID: ${extra.id}\n`,
  };
}

export async function notifySales(
  lead: RfqPayload,
  extra: { id: string; files: { originalName: string; byteSize: number }[] },
): Promise<NotifyResult> {
  const to = recipients();
  const from = process.env.RFQ_NOTIFY_FROM;
  const apiKey = process.env.RESEND_API_KEY;
  const summary = renderLeadSummary(lead, extra);

  if (!to.length || !from || !apiKey) {
    const missing = [
      !to.length && 'RFQ_NOTIFY_TO',
      !from && 'RFQ_NOTIFY_FROM',
      !apiKey && 'RESEND_API_KEY',
    ].filter(Boolean);

    console.warn(
      `[rfq] Lead ${extra.id} stored but NOT emailed — missing ${missing.join(', ')}.\n` +
        `${summary.subject}\n${summary.text}`,
    );
    return { status: 'skipped', reason: `missing ${missing.join(', ')}` };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: lead.email,
        subject: summary.subject,
        text: summary.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[rfq] Lead ${extra.id} stored but email failed: ${response.status} ${detail}`);
      return { status: 'failed', reason: `${response.status}` };
    }

    return { status: 'sent', to };
  } catch (error) {
    console.error(`[rfq] Lead ${extra.id} stored but email threw:`, error);
    return { status: 'failed', reason: error instanceof Error ? error.message : 'unknown' };
  }
}
