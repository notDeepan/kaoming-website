import { getTranslations } from 'next-intl/server';
import { RFQ_HREF } from '@/lib/nav';
import { Action } from './action';

/** The closing move on every page — Part A.2 ends in a quote request. */
export async function CtaBlock({ machine, slug }: { machine?: string; slug?: string }) {
  const t = await getTranslations('Cta');

  return (
    <section className="border-t border-km-steel-600/60 bg-km-charcoal">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-5 py-20 sm:px-6 md:flex-row md:items-center md:justify-between xl:px-10">
        <div className="max-w-[40ch]">
          <h2 className="text-h2 text-km-paper uppercase">{t('title')}</h2>
          <p className="mt-4 text-km-steel-400">{machine ? t('bodyMachine', { machine }) : t('body')}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Action
            href={slug ? `${RFQ_HREF}?machine=${slug}&source=product` : `${RFQ_HREF}?source=rfq`}
            variant="primary"
          >
            {t('requestQuote')}
          </Action>
          <Action href="/support/contact" variant="secondary">
            {t('contact')}
          </Action>
        </div>
      </div>
    </section>
  );
}
