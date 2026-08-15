import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { Link } from '@/i18n/navigation';
import type { Workpiece } from '@/lib/machines';

/**
 * Scene 07 — Workpiece (Part G.9). "What does this machine actually make?"
 *
 * **KAO MING has supplied nothing to answer it.** The kit carries no workpiece
 * photography, no workpiece geometry, and no series states a `workpieces[]`
 * block; KAO MING's own applications page, per the site audit in
 * `company.json`, has never been filled in either. Part G.9 is explicit that
 * "photographs are always the authoritative visual" — so the scene states the
 * gap in the place a buyer would look for the answer, which is also the place
 * that makes the gap impossible for anyone to forget.
 *
 * The moment one workpiece is transcribed, the cards below render and this
 * component changes not at all.
 */
export async function WorkpieceScene({
  index,
  workpieces,
  machine,
}: {
  index: string;
  workpieces: Workpiece[];
  machine: string;
}) {
  const t = await getTranslations('Workpiece');

  return (
    <section id="workpiece" className="border-t border-km-steel-600/60">
      <div className="mx-auto max-w-[1600px] px-5 py-24 sm:px-6 xl:px-10">
        <SectionHeader index={index} label={t('label')} title={t('title')} />

        {workpieces.length ? (
          <Reveal as="ul" className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {workpieces.map((workpiece) => (
              <li key={workpiece.id} data-workpiece data-reveal className="flex flex-col">
                {workpiece.image ? (
                  <Image
                    src={workpiece.image.src}
                    alt={workpiece.name}
                    width={workpiece.image.width}
                    height={workpiece.image.height}
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 46vw, 92vw"
                    className="h-auto w-full border border-km-steel-600/60"
                  />
                ) : null}

                <h3 className="mt-6 font-display text-h3 text-km-paper">{workpiece.name}</h3>

                <dl className="mt-4 flex flex-col gap-2">
                  {(
                    [
                      ['material', workpiece.material],
                      ['dimensions', workpiece.dimensions],
                      ['requirements', workpiece.requirements],
                      ['machine', workpiece.machine],
                    ] as [string, string | null][]
                  )
                    .filter((row): row is [string, string] => Boolean(row[1]))
                    .map(([key, value]) => (
                      <div key={key} className="flex flex-wrap items-baseline gap-x-4">
                        <dt className="km-label min-w-32 text-km-steel-400">{t(`field.${key}`)}</dt>
                        <dd className="font-mono text-spec text-km-offwhite">{value}</dd>
                      </div>
                    ))}
                </dl>

                <Link
                  href="/applications"
                  className="km-label mt-auto pt-6 text-km-red-glow hover:text-km-paper"
                >
                  {t('exploreApplication')}
                </Link>
              </li>
            ))}
          </Reveal>
        ) : (
          <div className="mt-14 max-w-[62ch] border-s-2 border-km-warning ps-6">
            <p className="text-body text-km-offwhite">{t('pending.body', { machine })}</p>
            <p className="mt-4 text-small text-km-steel-400">{t('pending.note')}</p>
          </div>
        )}
      </div>
    </section>
  );
}
