import { getTranslations } from 'next-intl/server';

/**
 * Prime directive 2 (Part 0.2): the UI must visually distinguish a verified
 * specification from a visual representation.
 *
 * So every specification block states the catalogue it was transcribed from,
 * and every series whose catalogue page has not been transcribed yet says so on
 * the page rather than quietly showing a shorter table. A buyer comparing
 * machines can tell the difference between "this is all of it" and "this is
 * what we have read so far".
 */
export async function SourceNote({
  document,
  status,
}: {
  document: string;
  status?: string | null;
}) {
  const t = await getTranslations('Products');

  return (
    <div className="mt-8 border-t border-km-steel-600/50 pt-5">
      <p className="km-label flex flex-wrap items-center gap-x-3 gap-y-1 text-km-steel-400">
        <span className="text-km-success">{t('verified')}</span>
        <span aria-hidden="true" className="h-px w-5 bg-km-steel-600" />
        <span className="normal-case tracking-normal">{document}</span>
      </p>
      {status ? (
        <p className="mt-3 max-w-[70ch] text-small text-km-warning">
          <span className="km-label me-2 text-km-warning">{t('incomplete')}</span>
          {status}
        </p>
      ) : null}
    </div>
  );
}
