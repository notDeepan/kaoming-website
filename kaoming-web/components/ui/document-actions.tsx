'use client';

import { useTranslations } from 'next-intl';
import { track } from '@/lib/analytics';
import { ActionLink } from './action';

/**
 * VIEW and DOWNLOAD for one document, with the Part Q events attached.
 *
 * A client island of exactly two links, so the card around it stays a Server
 * Component. The distinction the taxonomy draws is real: `catalogue_opened` is a
 * buyer reading in the browser, `pdf_downloaded` is a buyer taking the file to a
 * meeting. Sales reads those two very differently.
 */
export function DocumentActions({
  documentId,
  href,
  align = 'start',
}: {
  documentId: string;
  href: string;
  /** `end` pushes the pair to the trailing edge of a row. */
  align?: 'start' | 'end';
}) {
  const t = useTranslations('Resources');

  return (
    <div className={`flex flex-wrap gap-3 ${align === 'end' ? 'ms-auto' : ''}`}>
      <ActionLink
        href={href}
        target="_blank"
        rel="noopener"
        variant="secondary"
        data-document-view={documentId}
        onClick={() => track({ name: 'catalogue_opened', doc_id: documentId })}
      >
        {t('view')}
      </ActionLink>
      <ActionLink
        href={href}
        download
        variant="text"
        data-document-download={documentId}
        onClick={() => track({ name: 'pdf_downloaded', doc_id: documentId })}
      >
        {t('download')}
      </ActionLink>
    </div>
  );
}
