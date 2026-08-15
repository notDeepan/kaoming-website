import { getTranslations } from 'next-intl/server';
import { Action } from '@/components/ui/action';
import { ContentGap, PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { SectionHeader } from '@/components/ui/section-header';
import { contact } from '@/lib/company';
import { RFQ_HREF } from '@/lib/nav';

/**
 * Service, Parts and FAQ (Part E.1 SUPPORT).
 *
 * KAO MING has published no service terms, no parts catalogue and no FAQ. Three
 * routes the chrome links to, and one honest thing to put on them: the desk that
 * can actually answer, with the real telephone number and the real address, plus
 * the enquiry form that already routes to sales.
 *
 * That is a genuinely useful page for a buyer with a machine down, and it is
 * more useful than three pages of invented service promises would be — a
 * response time this site made up is a commitment KAO MING never gave.
 */
export async function SupportPage({
  namespace,
  path,
}: {
  /** Message namespace: `Service`, `Parts` or `Faq`. */
  namespace: 'Service' | 'Parts' | 'Faq';
  path: string;
}) {
  const t = await getTranslations(namespace);
  const tSupport = await getTranslations('Support');

  return (
    <>
      <PageHeader label={tSupport('label')} title={t('title')} lede={t('lede')} />

      <section className={`${SHELL} pb-24`}>
        <ContentGap>
          <p>{t('gap')}</p>
        </ContentGap>
      </section>

      <section className="border-t border-km-steel-600/60 bg-km-charcoal">
        <div className={`${SHELL} py-20`}>
          <SectionHeader index="01" label={tSupport('reachLabel')} title={tSupport('reachTitle')} />

          <dl className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="border-t border-km-steel-600/60 pt-5">
              <dt className="km-label text-km-steel-400">{tSupport('field.tel')}</dt>
              <dd className="mt-2 font-mono text-spec text-km-offwhite">
                <a href={`tel:${contact.tel.replace(/[^+\d]/g, '')}`} className="hover:text-km-blue">
                  {contact.tel}
                </a>
              </dd>
            </div>
            <div className="border-t border-km-steel-600/60 pt-5">
              <dt className="km-label text-km-steel-400">{tSupport('field.email')}</dt>
              <dd className="mt-2 text-body text-km-offwhite">
                <a href={`mailto:${contact.email}`} className="hover:text-km-blue">
                  {contact.email}
                </a>
              </dd>
            </div>
            <div className="border-t border-km-steel-600/60 pt-5">
              <dt className="km-label text-km-steel-400">{tSupport('field.address')}</dt>
              <dd className="mt-2 text-body text-km-offwhite">{contact.address}</dd>
            </div>
          </dl>

          <div className="mt-12 flex flex-wrap gap-4">
            <Action href={`${RFQ_HREF}?source=contact`} variant="primary">
              {tSupport('cta')}
            </Action>
            <Action href="/company/network" variant="secondary">
              {tSupport('findAgent')}
            </Action>
          </div>

          <Provenance>{tSupport('provenance')}</Provenance>
        </div>
      </section>

      {/* Kept so the route is self-describing in a sitemap and in search. */}
      <p className="sr-only">{path}</p>
    </>
  );
}
