import { getTranslations } from 'next-intl/server';
import { ActionLink } from './action';

/**
 * Part N.3 — the resource centre renders only from the document manifest, so a
 * superseded file cannot linger on a page nobody remembers to edit.
 *
 * File size is stated because these are print-resolution catalogues: the Bow Way
 * PDF is 67 MB, and a buyer on a phone deserves to know that before tapping.
 */
export async function DocumentCard({
  title,
  description,
  href,
  fileType,
  sizeBytes,
  language,
  version,
}: {
  title: string;
  description?: string;
  href: string;
  fileType: string;
  sizeBytes: number;
  language: string;
  version: string;
}) {
  const t = await getTranslations('Resources');
  const megabytes = sizeBytes / 1024 / 1024;
  const size = megabytes >= 1 ? `${megabytes.toFixed(1)} MB` : `${Math.round(sizeBytes / 1024)} KB`;

  return (
    <article
      data-reveal
      className="flex h-full flex-col border border-km-steel-600/60 bg-km-steel-800 p-6 transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-steel-600 sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="km-label bg-km-red px-2 py-1 text-km-on-brand">{fileType}</span>
        <span className="km-label border border-km-steel-600 px-2 py-1 text-km-offwhite">
          {version}
        </span>
        <span className="km-label border border-km-steel-600 px-2 py-1 text-km-offwhite uppercase">
          {language}
        </span>
        <span className="font-mono text-spec text-km-offwhite">{size}</span>
      </div>

      <h3 className="mt-6 font-display text-h3 text-km-paper">{title}</h3>
      {description ? <p className="mt-3 text-small text-km-offwhite">{description}</p> : null}

      <div className="mt-auto flex flex-wrap gap-3 pt-8">
        <ActionLink href={href} target="_blank" rel="noopener" variant="secondary">
          {t('view')}
        </ActionLink>
        <ActionLink href={href} download variant="text">
          {t('download')}
        </ActionLink>
      </div>
    </article>
  );
}
