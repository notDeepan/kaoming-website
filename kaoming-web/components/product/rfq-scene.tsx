import { getTranslations } from 'next-intl/server';
import { RfqForm } from '@/components/rfq/rfq-form';
import { SectionHeader } from '@/components/ui/section-header';
import { countryOptions } from '@/lib/geo';
import { allSeries } from '@/lib/machines';

/**
 * Scene 11 — RFQ (Part G.10, Part M.1). The end of every product journey.
 *
 * The form is embedded here rather than linked to. A buyer who has just watched
 * the machine come apart and read its specification should not have to arrive on
 * a second page and start again — Part A.2 makes the pre-populated RFQ the
 * success condition of the whole system, and every navigation between here and
 * there is somewhere to lose them.
 *
 * `/rfq` still exists for the header CTA and for links from elsewhere. Same
 * component, same schema, same API route; only the entry point differs.
 */
export async function RfqScene({
  index,
  slug,
  machine,
  locale,
}: {
  index: string;
  slug: string;
  machine: string;
  /** Country names come from `Intl.DisplayNames` on the server only — running
   *  it on both sides breaks hydration (see lib/geo). */
  locale: string;
}) {
  const t = await getTranslations('Rfq');

  const machines = allSeries.map((series) => ({
    slug: series.slug,
    name: series.name,
    category: series.categorySlug,
  }));

  return (
    <section id="rfq" className="border-t border-km-steel-600/60 bg-km-charcoal">
      <div className="mx-auto max-w-[1600px] px-5 py-24 sm:px-6 xl:px-10">
        <SectionHeader index={index} label={t('label')} title={t('productTitle')} />

        <p className="mt-8 max-w-[62ch] text-body text-km-steel-400">
          {t('productLede', { machine })}
        </p>

        <div className="mt-14">
          <RfqForm
            machines={machines}
            countries={countryOptions(locale)}
            preselect={[slug]}
            source="product"
          />
        </div>
      </div>
    </section>
  );
}
