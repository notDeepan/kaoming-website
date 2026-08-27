import type { ReactNode } from 'react';

export type Figure = { label: string; value: ReactNode };

/**
 * Numbers, arranged so they cannot be read as one number.
 *
 * Two big mono figures set side by side with small labels above them —
 * `FOUNDED 1968` beside `LATEST MILESTONE 2016` — are read by the eye as
 * "19682016" before the labels are read at all. Reported from the page, and
 * it is not a nitpick: the whole point of setting a figure large is that it is
 * legible at a glance, and a pair of them at a glance is a different number.
 *
 * So a set of figures gets one of two arrangements, and never a bare row:
 *
 *   `Figures`      one per line, label above value, a hairline between. For the
 *                  two or three figures that sit beside a page title.
 *   `FigureStrip`  the four-across comparison band, with a rule between every
 *                  cell. Alignment is right there — these exist to be read
 *                  against each other — but a divider is what stops the reading
 *                  running on from one cell into the next.
 */
export function Figures({
  figures,
  className = '',
}: {
  figures: Figure[];
  className?: string;
}) {
  return (
    <dl className={`flex flex-col ${className}`}>
      {figures.map((figure, index) => (
        <div
          key={figure.label}
          data-figure
          className={index > 0 ? 'mt-5 border-t border-km-steel-600/60 pt-5' : undefined}
        >
          <dt className="km-label text-km-steel-400">{figure.label}</dt>
          <dd className="mt-2 font-mono text-spec-xl leading-none text-km-paper">{figure.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The comparison band: four figures across a full-width strip.
 *
 * Kept as a grid — these are read against each other and staggering them makes
 * the eye hunt for a baseline (see `COMPARISON` in components/ui/layout). What
 * is new is the rule between the cells and the padding either side of it, so
 * two adjacent values are separated by something rather than by whitespace
 * alone.
 */
export function FigureStrip({
  figures,
  className = '',
}: {
  figures: Figure[];
  className?: string;
}) {
  return (
    <dl className={`grid grid-cols-1 gap-y-10 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
      {figures.map((figure, index) => (
        <div
          key={figure.label}
          data-figure
          data-reveal
          className={[
            // The divider is a left border rather than a gap, and it is
            // suppressed at the start of each row so it never hangs off the
            // edge of the strip.
            'sm:ps-8 xl:ps-10',
            index % 2 === 0 ? 'sm:border-s-0' : 'sm:border-s sm:border-km-steel-600/60',
            index % 4 === 0 ? 'xl:border-s-0' : 'xl:border-s xl:border-km-steel-600/60',
            index % 2 === 0 ? 'sm:ps-0' : '',
            index % 4 === 0 ? 'xl:ps-0' : 'xl:ps-10',
          ].join(' ')}
        >
          <dd className="font-mono text-spec-xl leading-none text-km-paper">{figure.value}</dd>
          <dt className="km-label mt-4 border-t border-km-steel-600/60 pt-4 text-km-steel-400">
            {figure.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
