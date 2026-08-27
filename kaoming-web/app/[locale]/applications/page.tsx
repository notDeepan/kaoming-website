import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContentGap, PageHeader, SHELL } from '@/components/ui/page-shell';
import { Reveal } from '@/components/ui/reveal';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { applications } from '@/lib/applications';
import { alternatesFor } from '@/lib/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Applications' });
  return {
    title: t('indexTitle'),
    description: t('indexLede'),
    alternates: alternatesFor(locale, '/applications'),
  };
}

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Applications');
  const tNav = await getTranslations('Nav');

  return (
    <>
      <PageHeader label={t('label')} title={t('indexTitle')} lede={t('indexLede')} />

      {/*
       * An index, not a grid of tiles.
       *
       * This was six identical bordered rectangles, each holding a name, a line
       * of small grey text and a bare arrow — which is exactly the "too many
       * boxes" Part B.2 puts on its own avoid list, and the arrow was the only
       * thing offering to be clicked without saying where to.
       *
       * A numbered index reads the way the rest of this site reads: a rule per
       * row, the industry set large, what KAO MING has actually published about
       * it stated as a figure on the right, and a real label on the link. It
       * also lets the one industry with nothing published say so plainly
       * instead of looking identical to the five that do.
       */}
      <section className={`${SHELL} pb-24`}>
        <Reveal as="ol" className="border-t border-km-steel-600/60">
          {applications.map((application, index) => {
            const stated = application.evidence.length;
            return (
              <li key={application.slug} data-application-tile data-reveal>
                <Link
                  href={`/applications/${application.slug}`}
                  className="group flex flex-col gap-3 border-b border-km-steel-600/40 py-8 transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-red sm:flex-row sm:items-baseline sm:gap-10"
                >
                  <span className="km-label w-10 shrink-0 text-km-steel-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-h3 text-km-paper transition-colors duration-(--duration-km) group-hover:text-km-red-glow">
                      {tNav(`application.${application.key}`)}
                    </span>
                    <span className="mt-2 block max-w-[52ch] text-small text-km-steel-400">
                      {stated ? t('tile.stated', { count: stated }) : t('tile.pending')}
                    </span>
                  </span>

                  {/* How much KAO MING has said about this industry. Set at h3,
                      not at the figure size the specification bands use: the
                      counts here are ones and twos, and a 64px "1" beside a 30px
                      industry name puts the weight on the wrong word. Nothing
                      published shows an em dash rather than a zero — zero is a
                      measurement, and this is an absence. */}
                  <span className="shrink-0 font-mono text-h3 leading-none text-km-paper sm:w-12 sm:text-end">
                    {stated || '—'}
                  </span>

                  <span className="km-label shrink-0 text-km-red-glow sm:w-40 sm:text-end">
                    {t('tile.action')}
                    <span
                      aria-hidden="true"
                      className="ms-2 inline-block transition-transform duration-(--duration-km) ease-(--ease-km) group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </Reveal>

        <div className="mt-14">
          <ContentGap>
            <p>{t('gap')}</p>
          </ContentGap>
        </div>
      </section>
    </>
  );
}
