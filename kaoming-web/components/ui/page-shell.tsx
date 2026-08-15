import type { ReactNode } from 'react';

/**
 * The frame every secondary page uses (Part D).
 *
 * M7 adds thirteen routes at once. Repeating the shell class string and the
 * hero block thirteen times is how a site ends up with four different top
 * paddings and three different h1 sizes, so both live here.
 */

export const SHELL = 'mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10';

export function PageHeader({
  label,
  title,
  lede,
  aside,
}: {
  label: string;
  title: string;
  lede?: ReactNode;
  /** Figures or actions that belong beside the title, not under it. */
  aside?: ReactNode;
}) {
  return (
    <header className={`${SHELL} pt-36 pb-16 sm:pt-44`}>
      <p className="km-label text-km-red-glow">{label}</p>
      <div className="mt-6 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="max-w-[20ch] text-h1 text-km-paper uppercase">{title}</h1>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {lede ? <div className="mt-8 max-w-[62ch] text-body text-km-steel-400">{lede}</div> : null}
    </header>
  );
}

/**
 * A stated gap.
 *
 * Used wherever KAO MING has not supplied something the spec asks for. It is
 * deliberately a visible, styled component rather than a silent omission: a
 * missing section looks like an oversight, and the person who can fix it is the
 * one reading the page.
 */
export function ContentGap({ children }: { children: ReactNode }) {
  return (
    <div data-content-gap className="max-w-[70ch] border-s-2 border-km-warning ps-6">
      <div className="text-body text-km-offwhite">{children}</div>
    </div>
  );
}

/** Provenance line. Every page built from transcribed facts states its source. */
export function Provenance({ children }: { children: ReactNode }) {
  return (
    <p className="km-label mt-16 max-w-[80ch] border-t border-km-steel-600/60 pt-6 text-km-steel-400">
      {children}
    </p>
  );
}
