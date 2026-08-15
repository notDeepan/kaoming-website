'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { CompareToggle } from '@/components/compare/compare-controls';
import { Counter } from '@/components/ui/counter';
import { SectionHeader } from '@/components/ui/section-header';
import { ModelTable, SpecList } from '@/components/ui/spec-table';
import type { Series, SpecRow } from '@/lib/machines';
import { hasConvertibleValues, inUnit, type Unit } from '@/lib/units';

/**
 * Scene 09 — Specifications (Part G.10).
 *
 * "Never dump the table first." The big-number grid answers the four questions a
 * buyer asks before any others; the full verified table is one press away and
 * stays out of the way until then. ADD TO COMPARE sits here rather than only in
 * the hero, because this is where a buyer decides this machine is worth setting
 * beside another.
 *
 * The mm/in toggle converts for display only — see lib/units. It appears only
 * when this series actually states figures that can be converted, so it is never
 * a control that does nothing.
 */
export function SpecificationsScene({
  index,
  series,
  highlights,
  /**
   * Passed in rather than imported: the source note is a Server Component, and
   * the highlight selection lives in lib/machines, which pulls in every
   * catalogue JSON. Neither belongs in this bundle.
   */
  sourceNote,
}: {
  index: string;
  series: Series;
  highlights: SpecRow[];
  sourceNote?: ReactNode;
}) {
  const t = useTranslations('Products');
  const tSpec = useTranslations('Spec');
  const tUnits = useTranslations('Units');

  const [expanded, setExpanded] = useState(false);
  const [unit, setUnit] = useState<Unit>('mm');

  const hasTable = series.specGroups.length > 0 || series.models.length > 0;

  const convertible = useMemo(
    () =>
      hasConvertibleValues([
        ...highlights.map((row) => row.value),
        ...series.specGroups.flatMap((group) => group.rows.map((row) => row.value)),
        ...series.models.flatMap((model) => model.cells),
      ]),
    [highlights, series.specGroups, series.models],
  );

  const groups = useMemo(
    () =>
      series.specGroups.map((group) => ({
        ...group,
        rows: group.rows.map((row) => ({ ...row, value: inUnit(row.value, unit) })),
      })),
    [series.specGroups, unit],
  );

  const models = useMemo(
    () =>
      series.models.map((model) => ({
        ...model,
        cells: model.cells.map((cell) => inUnit(cell, unit)),
      })),
    [series.models, unit],
  );

  return (
    <section id="specifications" className="border-t border-km-steel-600/60 bg-km-charcoal">
      <div className="mx-auto max-w-[1600px] px-5 py-24 sm:px-6 xl:px-10">
        <SectionHeader index={index} label={t('specLabel')} title={t('specTitle')} />

        {/* --------------------------------------------- the big-number grid */}
        {/* The four figures a buyer asks for first, on unequal columns and four
            baselines. They are a travel, a speed, a taper and a load — four
            different kinds of quantity, and a four-across ruler implies they are
            the same kind. */}
        {highlights.length ? (
          <dl className="mt-16 grid grid-cols-1 items-start gap-x-10 gap-y-14 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_0.85fr_1.15fr]">
            {highlights.map((highlight, index) => (
              <div
                key={highlight.label}
                data-spec-highlight
                className={['', 'xl:mt-16', 'xl:mt-6', 'xl:mt-24'][index % 4]}
              >
                <dd className="font-mono text-spec-xl text-km-paper">
                  <SpecFigure value={inUnit(highlight.value, unit)} />
                </dd>
                <dt className="km-label mt-4 border-t border-km-steel-600/60 pt-4 text-km-steel-400">
                  {tSpec(highlight.label)}
                </dt>
              </div>
            ))}
          </dl>
        ) : null}

        {/* ------------------------------------------------------- controls */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-km-steel-600/60 pt-8">
          {/* A series whose catalogue page has not been transcribed has nothing
              to expand. Putting "there is no table yet" behind a button labelled
              VIEW FULL SPECIFICATIONS would make a buyer press it to find out
              the answer is no, so that case says so on the page instead. */}
          {hasTable ? (
            <button
              type="button"
              data-spec-expand
              aria-expanded={expanded}
              aria-controls="full-specifications"
              onClick={() => setExpanded((value) => !value)}
              className="km-label inline-flex min-h-11 items-center gap-2.5 border border-km-red bg-km-red px-5 py-3 text-km-paper transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-red-glow hover:bg-transparent hover:text-km-red-glow"
            >
              {expanded ? t('hideSpecifications') : t('viewSpecifications')}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                className={`size-3 transition-transform duration-(--duration-km) ease-(--ease-km) ${
                  expanded ? '-rotate-90' : 'rotate-90'
                }`}
              >
                <path d="M5 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          ) : null}

          <CompareToggle
            entry={{ slug: series.slug, name: series.name, category: series.categorySlug }}
          />

          {convertible ? (
            <div
              role="group"
              aria-label={tUnits('label')}
              className="ms-auto flex items-center gap-1 border border-km-steel-600/60"
            >
              {(['mm', 'in'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  data-unit={option}
                  aria-pressed={unit === option}
                  onClick={() => setUnit(option)}
                  className={`km-label min-h-11 px-4 transition-colors duration-(--duration-km) ease-(--ease-km) ${
                    unit === option ? 'bg-km-steel-800 text-km-paper' : 'text-km-steel-400 hover:text-km-offwhite'
                  }`}
                >
                  {tUnits(option)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------------- the full table */}
        <div id="full-specifications" hidden={hasTable && !expanded} className="pt-14">
          {unit === 'in' ? (
            <p className="km-label mb-8 border-s-2 border-km-blue ps-4 text-km-blue">
              {tUnits('convertedNote')}
            </p>
          ) : null}

          {groups.length ? (
            <SpecList
              groups={groups}
              labelFor={(key) => tSpec(key)}
              groupLabelFor={(key) => tSpec(`group.${key}`)}
            />
          ) : null}

          {models.length ? (
            <div className="mt-16">
              <h3 className="km-label text-km-red-glow">{t('modelsTitle')}</h3>
              <ModelTable
                modelLabel={tSpec('model')}
                columns={series.modelColumns.map((column) => tSpec(column))}
                rows={models}
                caption={series.modelCodeRule ?? undefined}
              />
            </div>
          ) : (
            <p className="max-w-[70ch] text-km-warning">{t('noModelsYet')}</p>
          )}

          {sourceNote}
        </div>
      </div>
    </section>
  );
}

/**
 * Part D asks these figures to count up when they scroll into view. A value like
 * "3,000 – 6,000 mm" has two numbers and a range dash: counting it would be
 * nonsense, so only a single leading figure is animated and everything else is
 * printed exactly as the catalogue states it.
 */
function SpecFigure({ value }: { value: string }) {
  const match = /^([\d,]+(?:\.\d+)?)(\s.*)?$/.exec(value);
  if (!match) return <>{value}</>;

  const figure = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(figure)) return <>{value}</>;

  return <Counter value={figure} suffix={match[2] ?? ''} />;
}
