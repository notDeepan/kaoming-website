import type { ReactNode } from 'react';

/**
 * The composition system, taken from the subject's own vernacular.
 *
 * A dimensioned engineering elevation is not a grid of cards. The object sits
 * off-centre on the sheet; dimension lines run past it and off the edge; the
 * title block is hard in one corner; balloon numbers live out in the margin,
 * larger than the notes they point at; and the space between assemblies is
 * enormous while a callout and its leader nearly touch.
 *
 * That is the language here, and it is the opposite of what the site had —
 * one centred container, even rows, uniform gaps. Part B.2's own "explicitly
 * avoid" list already said as much: *too many boxes*.
 *
 * Three rules these primitives exist to enforce:
 *
 *  1. **The container is a default, not a law.** `Bleed` escapes it.
 *  2. **Nothing is 50/50.** The rails below are 5/7, 4/8 and 3/9.
 *  3. **Space is hierarchy.** `VOID` separates unrelated things; `WELD` is for
 *     things that belong together. There is no medium.
 */

/** The centred measure. Still the default for reading, never for composing. */
export const SHELL = 'mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10';

/** Release: between two unrelated ideas. Deliberately uncomfortable. */
export const VOID = 'py-40 sm:py-56';
/** The normal beat inside one idea. */
export const BEAT = 'py-24 sm:py-32';
/** Compression: things that belong to each other nearly touch. */
export const WELD = 'gap-2';

/**
 * Asymmetric rails. The first number is the narrow column.
 *
 * `lg:` and up only — below that, an asymmetric split is just a squeeze, and
 * the honest mobile layout is one column.
 */
export const RAIL = {
  /** 5/7 — copy beside a dominant object. */
  fiveSeven: 'grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20',
  /** 7/5 — object beside supporting copy. */
  sevenFive: 'grid gap-12 lg:grid-cols-[7fr_5fr] lg:gap-20',
  /** 4/8 — a title block against a wide field. */
  fourEight: 'grid gap-12 lg:grid-cols-[4fr_8fr] lg:gap-20',
  /** 3/9 — a margin note against the body. */
  threeNine: 'grid gap-10 lg:grid-cols-[3fr_9fr] lg:gap-16',
} as const;

/**
 * Escapes the container to the full viewport width.
 *
 * `100vw` rather than `100%` because the parent is the measure, not the
 * viewport; the negative margin is half the difference. `overflow-x` is guarded
 * on `body`, so this cannot introduce a sideways scroll.
 */
export function Bleed({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative left-1/2 w-screen -translate-x-1/2 ${className}`}>{children}</div>
  );
}

/**
 * Anchors content hard to one edge of the viewport, with the measure preserved
 * on the inside — the layout equivalent of a title block.
 */
export function EdgeAnchored({
  side = 'start',
  children,
  className = '',
}: {
  side?: 'start' | 'end';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative left-1/2 w-screen -translate-x-1/2 ${
        side === 'start' ? 'ps-5 pe-0 sm:ps-6 xl:ps-10' : 'pe-5 ps-0 sm:pe-6 xl:pe-10'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The signature: a balloon number in the margin.
 *
 * On a drawing the callout numeral is larger than the note it labels and sits
 * outside the object, with a leader running to it. Here the section index is set
 * in mono at 8–12rem, dropped to a whisper of opacity, hung in the margin, and
 * given a hairline that runs off the side of the viewport.
 *
 * It is decoration only in the sense that a drawing balloon is: it encodes the
 * sequence a buyer moves through (Part A.2), which is real information, and the
 * spec asks for section indices throughout.
 */
export function MarginIndex({ index, className = '' }: { index: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -top-6 start-0 -z-1 select-none font-mono leading-none text-km-steel-400/10 [font-size:clamp(5rem,12vw,11rem)] ${className}`}
    >
      {index}
    </span>
  );
}

/**
 * A hairline that starts at the content and runs off the viewport edge — the
 * dimension line that does not stop politely at the container.
 */
export function EdgeRule({ side = 'end' }: { side?: 'start' | 'end' }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-0 h-px bg-km-steel-600/60 ${
        side === 'end' ? 'start-0 w-screen' : 'end-0 w-screen'
      }`}
    />
  );
}

/**
 * Vertical stagger for a set of items, so the eye travels diagonally instead of
 * scanning a flat line. Index-based, and it only engages from `lg:` up — on a
 * phone every item is full width and an offset would read as a mistake.
 */
export function staggerOffset(index: number): string {
  const steps = ['lg:mt-0', 'lg:mt-24', 'lg:mt-12', 'lg:mt-32'];
  return steps[index % steps.length];
}
