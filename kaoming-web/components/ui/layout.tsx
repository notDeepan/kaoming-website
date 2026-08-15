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

/**
 * Indent for a staggered list, as an inline style — the step depends on the
 * item's position, which Tailwind cannot express as a static class.
 *
 * **Zero below `lg`.** At 390px a fifth row indented five steps had 160px of
 * padding and 160px left for its title; the stagger is a wide-screen device and
 * on a phone it is just a squeeze. Returning a custom property that the `lg`
 * breakpoint consumes keeps the rule in CSS where the media query lives.
 */
export function stepIndent(index: number, step = 2.5): React.CSSProperties {
  return { '--km-step': `${index * step}rem` } as React.CSSProperties;
}

/** Paired with `stepIndent`: applies the step only from `lg` up. */
export const STEP_INDENT = 'lg:ps-(--km-step)';

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
 * viewport; the negative margin is half the difference.
 *
 * **`100vw` includes the scrollbar.** On a platform with classic scrollbars —
 * Windows Chrome, which is most of this site's buyers — the viewport unit is
 * ~15px wider than the document, so every bleed on the page would push a
 * horizontal scrollbar. It does not here only because `body` carries
 * `overflow-x: clip` (globals.css), and `clip` rather than `hidden` because
 * `hidden` makes the body a scroll container and the pinned ScrollTrigger
 * scenes stop sticking.
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
      /**
       * No negative z-index.
       *
       * `-z-1` is the obvious way to put a numeral behind its content and it
       * silently deleted two of the five on the homepage: a section with a
       * background and no stacking context of its own paints that background
       * *above* any descendant on a negative layer, so the numerals inside the
       * charcoal bands were painted and then covered. Both elements here are
       * positioned, so DOM order alone puts the content on top — which is all
       * that was ever needed.
       */
      className={`pointer-events-none absolute -top-6 start-0 select-none font-mono leading-none text-km-steel-400/10 [font-size:clamp(5rem,12vw,11rem)] ${className}`}
    >
      {index}
    </span>
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
