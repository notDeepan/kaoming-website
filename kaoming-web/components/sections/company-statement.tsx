import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Action } from '@/components/ui/action';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { identity, history } from '@/lib/company';

const SHELL = 'mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10';

/**
 * Who this is, immediately under the hero.
 *
 * The hero puts a photograph and eight words on the screen. This is the part
 * that has to earn the next scroll: KAO MING's own account of how the company
 * started, the three claims they make about themselves — quoted as claims,
 * because that is what they are — and the two routes deeper.
 *
 * Every string is verbatim from `content/company/company.json`. The only thing
 * this file decides is the order.
 *
 * The heritage photograph is the works gate at Fongyuan, which is where the
 * origin story physically happened. It is the one image on the site that is
 * about 1968 rather than about now, which is why it belongs beside this
 * paragraph and nowhere else.
 */
export async function CompanyStatement() {
  const t = await getTranslations('Home');
  const [foundedIn] = history.span;

  return (
    <section className={`${SHELL} py-24 sm:py-32`}>
      <SectionHeader index="01" label={t('storyLabel')} title={t('storyTitle')} />

      <Reveal className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          {/* The origin story, as KAO MING tells it. Set at reading size rather
              than as a pull quote: it is the only paragraph on the landing page
              that is genuinely worth reading, and shrinking it to caption size
              is how a company's own account of itself becomes decoration. */}
          <p data-reveal className="max-w-[58ch] text-h3 text-balance text-km-paper">
            {identity.originStory}
          </p>

          <ul className="mt-12 flex flex-col gap-7">
            {identity.positioningClaims.map((claim) => (
              <li
                key={claim}
                data-claim
                data-reveal
                className="max-w-[56ch] border-s-2 border-km-blue ps-6"
              >
                <p className="text-body text-km-offwhite">“{claim}”</p>
              </li>
            ))}
          </ul>

          <p data-reveal className="km-label mt-8 max-w-[64ch] text-km-steel-400">
            {t('storyNote')}
          </p>

          <div data-reveal className="mt-12 flex flex-wrap gap-4">
            <Action href="/company/about" variant="secondary">
              {t('storyAction')}
            </Action>
            <Action href="/company/history" variant="text">
              {t('storyHistory', { year: foundedIn })}
            </Action>
          </div>
        </div>

        <figure data-reveal className="lg:pt-4">
          <div className="relative aspect-4/3 overflow-hidden border border-km-steel-600/60">
            <Image
              src="/img/factory/kaoming-factory-04-heritage-kaoming-gate.jpg"
              alt={t('heritageAlt')}
              fill
              sizes="(min-width: 1024px) 40vw, 94vw"
              className="object-cover"
            />
          </div>
          <figcaption className="km-label mt-4 text-km-steel-400">{t('heritageCaption')}</figcaption>
        </figure>
      </Reveal>
    </section>
  );
}
