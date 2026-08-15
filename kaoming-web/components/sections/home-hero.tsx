import { getTranslations } from 'next-intl/server';
import { Action } from '@/components/ui/action';
import { DimensionRule, MachinePlate } from '@/components/ui/machine-plate';
import { RFQ_HREF } from '@/lib/nav';
import { seriesBySlug } from '@/lib/machines';
import { HeroSequence } from './hero-sequence';

/**
 * Part F.1 — the hero.
 *
 * The spec's first choice is the flagship 3D model with a scripted camera; that
 * is M3. The sanctioned M1 fallback is photography, and the kit's own manifest
 * names the image: the 1445GN three-quarter master, "the strongest image in the
 * archive". It runs with the background knocked out so the machine stands in the
 * dark hall rather than in a white box.
 *
 * The headline is set at `--text-h1`, not `--text-hero`. The hero token tops out
 * at 136px, which needs the full width of the viewport — right for M3, where the
 * machine is a full-bleed scene behind the type. Here the machine sits beside
 * the type and has to be visible without scrolling, because a page that opens
 * with a wall of words is the one thing Part 0.1 forbids. `--text-hero` returns
 * when the 3D scene can carry it.
 *
 * The dimension beneath the machine is the largest X travel in the Neptunus
 * catalogue — transcribed, not derived — because size is what makes this machine
 * land in a photograph.
 */
export async function HomeHero() {
  const t = await getTranslations('Home');
  const tSpec = await getTranslations('Spec');

  const gn = seriesBySlug.get('kmc-gn');
  const hero = gn?.images.find((image) => image.model === 'KMC-1445GN');
  const largest = gn?.models.at(-1);

  return (
    <HeroSequence>
      <section className="relative overflow-hidden">
        <div
          data-hero-line
          aria-hidden="true"
          /* Opacity 0 in the markup: the line exists only as the load sequence's
             light pass, so with no JavaScript or reduced motion it never shows. */
          className="absolute inset-x-0 top-24 h-px origin-left bg-km-red opacity-0 sm:top-28"
        />

        {/* 4/8, and the machine overlaps the copy rather than sitting beside it.
            A 50/50 hero with the headline in one half and the product in the
            other is the arrangement every landing page uses; the machine is
            14.5 metres long and should dominate the frame it is in. */}
        <div className="mx-auto grid max-w-[1600px] items-center gap-x-8 gap-y-12 px-5 pt-32 pb-16 sm:px-6 sm:pt-40 lg:min-h-[86svh] lg:grid-cols-[minmax(0,38%)_1fr] xl:px-10">
          <div data-hero-copy className="relative z-1">
            <p className="km-label text-km-steel-400">{t('eyebrow')}</p>
            {/* Runs wider than its column on purpose, so the last word sits over
                the machine's field instead of stopping at a tidy gutter. */}
            <h1 className="mt-8 max-w-[9ch] text-hero text-km-paper uppercase lg:w-[135%]">
              {t('heroTitle')}
            </h1>
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
            <div data-hero-machine className="lg:-mt-24">
              {/* The machine runs off the right edge — it is 14.5 metres long and
                  should not sit politely inside a margin. The dimension rule
                  stays inside the grid so its value is never clipped with it. */}
              <div className="lg:-me-10 xl:-me-16">
                <MachinePlate
                  image={hero.cut}
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

        <div
          data-hero-scroll
          className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-5 pb-10 sm:px-6 xl:px-10"
        >
          <span className="km-label text-km-steel-400">{t('scroll')}</span>
          <span aria-hidden="true" className="h-px w-12 bg-km-steel-600" />
        </div>
      </section>
    </HeroSequence>
  );
}
