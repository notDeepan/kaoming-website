import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { stepIndent, STEP_INDENT } from '@/components/ui/layout';
import { Link } from '@/i18n/navigation';

/**
 * Scene 08 — Applications (Part G.10). "WHERE IS IT USED?"
 *
 * A deliberate distinction: these tiles are **navigation into the application
 * pages** (Part J.1), not a claim that this particular machine has been sold
 * into each of those industries. Nothing in `_kit/content` says which industries
 * any series serves — KAO MING's own applications page has never been filled in
 * — so the band routes the question rather than answering it on the machine's
 * behalf. The answer arrives with the application pages at M7.
 *
 * Industries and their one-line descriptions come from Part G.10 itself, and the
 * routes from the Part E.1 site map, so nothing here is invented locally.
 */

const INDUSTRIES = [
  { key: 'aerospace', href: '/applications/aerospace' },
  { key: 'automotive', href: '/applications/automotive' },
  { key: 'energy', href: '/applications/energy' },
  { key: 'dieMold', href: '/applications/die-mold' },
  { key: 'heavyIndustry', href: '/applications/heavy-industry' },
] as const;

export async function ApplicationsBand({ index }: { index: string }) {
  const t = await getTranslations('Applications');
  const tNav = await getTranslations('Nav');

  return (
    <section id="applications" className="border-t border-km-steel-600/60 bg-km-charcoal">
      <div className="mx-auto max-w-[1600px] px-5 py-24 sm:px-6 xl:px-10">
        <SectionHeader index={index} label={t('label')} title={t('title')} />

        {/* Five hairline rows, staggered in from the left. A five-across row of
            bordered tiles is a nav bar wearing a section's clothes; these are
            five different industries and they are allowed to be different
            widths. */}
        <Reveal as="ul" className="mt-16 border-t border-km-steel-600/40">
          {INDUSTRIES.map((industry, index) => (
            <li
              key={industry.key}
              data-application-tile
              data-reveal
              className={`border-b border-km-steel-600/40 ${STEP_INDENT}`}
              style={stepIndent(index)}
            >
              <Link
                href={industry.href}
                className="group flex flex-wrap items-baseline gap-x-8 gap-y-1 py-6 transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-red-glow"
              >
                <span className="font-display text-h3 text-km-paper">
                  {tNav(`application.${industry.key}`)}
                </span>
                <span className="text-small text-km-steel-400">
                  {t(`industry.${industry.key}`)}
                </span>
                <span
                  aria-hidden="true"
                  className="km-label ms-auto shrink-0 text-km-steel-400 transition-transform duration-(--duration-km) ease-(--ease-km) group-hover:translate-x-2 group-hover:text-km-red-glow"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
