import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Action } from '@/components/ui/action';
import { Reveal } from '@/components/ui/reveal';
import { routing } from '@/i18n/routing';
import { alternatesFor } from '@/lib/site';
import { COMPANY, NETWORK } from '@/lib/company';
import { RFQ_HREF } from '@/lib/nav';

const SHELL = 'mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Contact' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/support/contact'),
  };
}

/**
 * Contact, built entirely from the verified company record. The enquiry form
 * itself is M2 — until it exists this page points at the RFQ route rather than
 * pretending to collect anything.
 */
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Contact');
  const tFooter = await getTranslations('Footer');

  const rows = [
    { label: tFooter('tel'), value: COMPANY.tel, href: `tel:${COMPANY.tel.replace(/[^+\d]/g, '')}` },
    { label: tFooter('fax'), value: COMPANY.fax, href: null },
    { label: tFooter('email'), value: COMPANY.email, href: `mailto:${COMPANY.email}` },
  ];

  return (
    <>
      <div className={`${SHELL} pt-36 pb-16 sm:pt-44`}>
        <p className="km-label text-km-red-glow">{t('label')}</p>
        <h1 className="mt-6 max-w-[16ch] text-h1 text-km-paper uppercase">{t('title')}</h1>
        <p className="mt-8 max-w-[62ch] text-km-steel-400">{t('lede')}</p>
      </div>

      <Reveal className={`${SHELL} grid gap-12 pb-24 lg:grid-cols-2 lg:gap-20`}>
        <section data-reveal aria-labelledby="hq">
          <h2 id="hq" className="km-label border-b border-km-steel-600/60 pb-4 text-km-steel-400">
            {tFooter('headquarters')}
          </h2>
          <address className="mt-8 not-italic">
            <p className="font-display text-h3 text-km-paper">{COMPANY.legalName}</p>
            <p className="mt-1 text-km-steel-400">{COMPANY.chineseName}</p>
            <p className="mt-6 max-w-[36ch] text-km-offwhite">{COMPANY.address}</p>
            <dl className="mt-8 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 font-mono text-spec">
              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-km-steel-400">{row.label}</dt>
                  <dd className="text-km-offwhite">
                    {row.href ? (
                      <a href={row.href} className="hover:text-km-blue">
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </address>
        </section>

        <section data-reveal aria-labelledby="routes">
          <h2 id="routes" className="km-label border-b border-km-steel-600/60 pb-4 text-km-steel-400">
            {t('routesTitle')}
          </h2>
          <div className="mt-8 flex flex-col gap-8">
            <div>
              <h3 className="font-display text-h3 text-km-paper">{t('quoteTitle')}</h3>
              <p className="mt-3 max-w-[46ch] text-small text-km-steel-400">{t('quoteBody')}</p>
              <Action href={`${RFQ_HREF}?source=contact`} variant="primary" className="mt-5">
                {t('quoteAction')}
              </Action>
            </div>
            <div className="border-t border-km-steel-600/60 pt-8">
              <h3 className="font-display text-h3 text-km-paper">{t('representativeTitle')}</h3>
              <p className="mt-3 max-w-[46ch] text-small text-km-steel-400">
                {t('representativeBody', {
                  agents: NETWORK.international,
                  countries: NETWORK.countries,
                })}
              </p>
              <Action href="/company/network" variant="secondary" className="mt-5">
                {t('representativeAction')}
              </Action>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
