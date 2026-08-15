import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { shortLinkFor, shortLinks } from '@/lib/short-links';

/**
 * `/m/<code>` — the printed short URL (Part J.7).
 *
 * Excluded from the next-intl middleware matcher on purpose, so this handler
 * sees the request first. It then redirects to the unprefixed product path and
 * lets the middleware choose the locale from the visitor's own browser: a code
 * printed once works for a buyer in Taichung and a buyer in Chicago without two
 * codes having to be printed.
 *
 * 307 rather than 301: the destination is a route this site owns and may
 * reorganise, and a permanently cached redirect to a path that later moves is
 * unfixable on signage that has already been printed.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return shortLinks.map((link) => ({ code: link.code }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = shortLinkFor(code);
  if (!link) notFound();
  redirect(link.target);
}
