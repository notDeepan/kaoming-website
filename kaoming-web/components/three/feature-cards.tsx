'use client';


/**
 * Scene 03's synced info cards (Part G.3).
 *
 * One card per camera stop, alternating side to side, each connected to the
 * machine by a drawn hairline. Content comes from `machine.features[]`, so the
 * scene adapts to however many features a series states — the spec's 3–6.
 *
 * These are real DOM, not sprites in the canvas. That is the point: Part P
 * requires every 3D scene to have a DOM equivalent, and this is it. A visitor
 * with no WebGL, or reading with a screen reader, gets the same engineering
 * copy in the same order.
 */

/**
 * The card limit and the selection live in `lib/features`, not here.
 *
 * A `'use client'` module may not export a constant a Server Component reads:
 * Next silently substitutes a client-reference stub, and the server then prints
 * or arithmetics an object. It did both on this very page. See lib/features.
 */
export function FeatureCard({
  index,
  total,
  title,
  copy,
}: {
  index: number;
  total: number;
  title: string;
  copy: string;
}) {
  const onRight = index % 2 === 1;

  return (
    <div
      data-feature-card={index}
      className={`pointer-events-none flex min-h-svh items-center px-5 sm:px-6 xl:px-10 ${
        onRight ? 'justify-end' : 'justify-start'
      }`}
    >
      <figure
        data-feature-panel
        className="pointer-events-auto relative w-full max-w-[26rem] border border-km-steel-600/70 bg-km-steel-800/92 p-6 backdrop-blur-sm sm:p-8"
      >
        {/* The hairline that ties the card back to the machine it describes. */}
        <span
          aria-hidden="true"
          data-feature-line
          className={`absolute top-1/2 hidden h-px origin-left bg-km-steel-600 lg:block ${
            onRight ? 'right-full w-[clamp(2rem,8vw,7rem)] origin-right' : 'left-full w-[clamp(2rem,8vw,7rem)]'
          }`}
        />
        <p className="km-label flex items-center gap-3 text-km-steel-400">
          <span className="text-km-red-glow">{String(index + 1).padStart(2, '0')}</span>
          <span aria-hidden="true" className="h-px w-5 bg-km-steel-600" />
          <span>
            {index + 1} / {total}
          </span>
        </p>
        <figcaption className="mt-5 font-display text-h3 text-km-paper">{title}</figcaption>
        {copy ? <p className="mt-4 text-small text-km-offwhite">{copy}</p> : null}
      </figure>
    </div>
  );
}
