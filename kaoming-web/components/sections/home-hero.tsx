import { getTranslations } from 'next-intl/server';
import { Action } from '@/components/ui/action';
import { DimensionRule, MachinePlate } from '@/components/ui/machine-plate';
import { RFQ_HREF } from '@/lib/nav';
import { seriesBySlug } from '@/lib/machines';
import { displayImage } from '@/lib/images';
import { Reveal } from '@/components/ui/reveal';

/**
 * Part F.1 — the machine statement.
 *
 * This was the hero until the landing page was re-ordered to open on the company
 * (see app/[locale]/page.tsx). It keeps everything that made it work — the
 * 1445GN three-quarter master the kit's own manifest calls "the strongest image
 * in the archive", knocked out so the machine stands in the hall rather than in
 * a white box, and the largest X travel in the Neptunus catalogue drawn beneath
 * it, because size is what makes this machine land in a photograph.
 *
 * What changed: it no longer has to fill the first screen, so the forced
 * `86svh` and the load sequence's opening light pass are gone. It is now the
 * band that opens the product half of the page, and it starts where the company
 * story finishes rather than above the fold.
 *
 * Its bespoke entrance went with them. It had a clip-path wipe of its own while
 * every other section on the page used the shared fade-and-rise, which made the
 * scroll read as two different pages stitched together. One idiom now — `Reveal`
 * — everywhere below the hero.
 */
export async function HomeHero() {
  const t = await getTranslations('Home');
  const tSpec = await getTranslations('Spec');

  const gn = seriesBySlug.get('kmc-gn');
  const hero = gn?.images.find((image) => image.model === 'KMC-1445GN');
  const largest = gn?.models.at(-1);

  return (
    <Reveal>
      <section className="relative overflow-hidden">
        {/* 4/8, and the machine overlaps the copy rather than sitting beside it.
            A 50/50 hero with the headline in one half and the product in the
            other is the arrangement every landing page uses; the machine is
            14.5 metres long and should dominate the frame it is in. */}
        <div className="mx-auto grid max-w-[1600px] items-center gap-x-8 gap-y-12 px-5 pt-8 pb-16 sm:px-6 lg:grid-cols-[minmax(0,38%)_1fr] xl:px-10">
          <div data-reveal className="relative z-1">
            {/* Not `eyebrow` any more — the hero above already says "Since 1968
                · Houli, Taichung", and repeating it two screens later reads as a
                template rather than a page. */}
            <p className="km-label text-km-steel-400">{t('machineEyebrow')}</p>
            {/* Runs wider than its column on purpose, so the last word sits over
                the machine's field instead of stopping at a tidy gutter. */}
            {/* h2, not h1: the page's heading is the company's name over the
                plant, and a landing page has one of those. */}
            <h2 className="mt-8 max-w-[9ch] text-h1 text-km-paper uppercase lg:w-[125%]">
              {t('heroTitle')}
            </h2>
            <p className="mt-10 max-w-[38ch] text-body text-km-steel-400">{t('heroBody')}</p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Action href="/products" variant="primary">
                {t('exploreProducts')}
              </Action>
              <Action href={RFQ_HREF} variant="secondary">
                {t('requestQuote')}
              </Action>
            </div>
          </div>

          {hero ? (
            <div data-reveal className="lg:-mt-24">
              {/* The machine runs off the right edge — it is 14.5 metres long and
                  should not sit politely inside a margin. The dimension rule
                  stays inside the grid so its value is never clipped with it. */}
              <div className="lg:-me-10 xl:-me-16">
                <MachinePlate
                  image={displayImage(hero)}
                  alt={t('heroImageAlt', { model: hero.model })}
                  priority
                  glow="lg"
                  sizes="(min-width: 1024px) 66vw, 92vw"
                />
              </div>
              {largest ? (
                <DimensionRule
                  label={tSpec('travelX')}
                  value={largest.cells[0]}
                  className="mt-3"
                />
              ) : null}
            </div>
          ) : null}
        </div>

      </section>
    </Reveal>
  );
}
