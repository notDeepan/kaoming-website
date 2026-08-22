import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SocialLinks } from '@/components/chrome/social-links';
import { Action } from '@/components/ui/action';
import { Reveal } from '@/components/ui/reveal';
import { routing } from '@/i18n/routing';
import { alternatesFor } from '@/lib/site';
import { COMPANY, contact, NETWORK } from '@/lib/company';
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
 * Contact, built entirely from the verified company record.
 *
 * KAO MING has two addresses and the site used to print one. The plant in the
 * Central Taiwan Science Park is the one in their footer and the one everything
 * ships from; the registered head office is still in Fongyuan, and it is the
 * address on the contract. Their own CONTACT page states both, along with the
 * uniform invoice number a Taiwanese buyer's finance department will ask for.
 * All three are here now.
 *
 * Addresses are printed in the reader's own script where KAO MING publishes one
 * — a Taiwanese courier does not want the romanised form.
 */
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Contact');
  const tFooter = await getTranslations('Footer');

  const chinese = locale.startsWith('zh');

  const locations = [
    {
      id: 'plant',
      title: t('plantTitle'),
      note: t('plantNote'),
      address: chinese ? contact.plantZh : contact.address,
      // Only the plant publishes numbers; the head office entry states none, so
      // none are invented for it.
      rows: [
        { label: tFooter('tel'), value: COMPANY.tel, href: `tel:${COMPANY.tel.replace(/[^+\d]/g, '')}` },
        { label: tFooter('fax'), value: COMPANY.fax, href: null },
        { label: tFooter('email'), value: COMPANY.email, href: `mailto:${COMPANY.email}` },
      ],
    },
    {
      id: 'head-office',
      title: t('headOfficeTitle'),
      note: t('headOfficeNote'),
      address: chinese ? contact.headOfficeZh : contact.headOffice,
      rows: [{ label: t('uniformNumber'), value: contact.uniformNumber, href: null }],
    },
  ];

  return (
    <>
      <div className={`${SHELL} pt-36 pb-16 sm:pt-44`}>
        <p className="km-label text-km-red-glow">{t('label')}</p>
        <h1 className="mt-6 max-w-[16ch] text-h1 text-km-paper uppercase">{t('title')}</h1>
        <p className="mt-8 max-w-[62ch] text-km-steel-400">{t('lede')}</p>
      </div>

      <Reveal className={`${SHELL} grid gap-12 pb-20 lg:grid-cols-2 lg:gap-20`}>
        <section data-reveal aria-labelledby="locations">
          <h2
            id="locations"
            className="km-label border-b border-km-steel-600/60 pb-4 text-km-steel-400"
          >
            {t('locationsTitle')}
          </h2>

          <p className="mt-8 font-display text-h3 text-km-paper">{COMPANY.legalName}</p>
          <p className="mt-1 text-km-steel-400">{COMPANY.chineseName}</p>

          <div className="mt-10 flex flex-col gap-10">
            {locations.map((location) => (
              <address key={location.id} data-location={location.id} className="not-italic">
                <p className="km-label text-km-red-glow">{location.title}</p>
                <p className="mt-3 max-w-[38ch] text-km-offwhite">{location.address}</p>
                <p className="mt-2 max-w-[42ch] text-small text-km-steel-400">{location.note}</p>
                <dl className="mt-5 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 font-mono text-spec">
                  {location.rows.map((row) => (
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
            ))}
          </div>

          <div className="mt-12 border-t border-km-steel-600/60 pt-6">
            <h3 className="km-label text-km-steel-400">{tFooter('follow')}</h3>
            <SocialLinks heading={tFooter('follow')} className="mt-2 -ms-2" />
          </div>
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
