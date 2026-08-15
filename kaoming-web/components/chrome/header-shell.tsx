'use client';

import { useRef, type ReactNode } from 'react';
import { useScrollSignal } from '@/lib/motion/smooth-scroll';

/** Background switches from transparent to charcoal past this offset (Part E.2). */
const SOLID_AT = 80;
/** Auto-hide only starts below this, so the header never flickers near the top. */
const HIDE_BELOW = 160;

/**
 * Scroll state is written straight to data attributes from the Lenis tick — no
 * component state, so scrolling never re-renders the header or anything under
 * it. Styling reacts through `data-*` variants in the markup below.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const solidRef = useRef(false);
  const hiddenRef = useRef(false);

  useScrollSignal(({ scroll, direction }) => {
    const element = headerRef.current;
    if (!element) return;

    const solid = scroll > SOLID_AT;
    if (solid !== solidRef.current) {
      solidRef.current = solid;
      element.dataset.solid = String(solid);
    }

    const hidden = direction === 1 && scroll > HIDE_BELOW;
    if (hidden !== hiddenRef.current) {
      hiddenRef.current = hidden;
      element.dataset.hidden = String(hidden);
    }
  });

  return (
    <header
      ref={headerRef}
      data-solid="false"
      data-hidden="false"
      className={[
        'fixed inset-x-0 top-0 z-120 border-b border-transparent',
        'transition-[transform,background-color,border-color,backdrop-filter]',
        'duration-(--duration-km-slow) ease-(--ease-km)',
        'data-[solid=true]:border-km-steel-600/60 data-[solid=true]:bg-km-charcoal/90 data-[solid=true]:backdrop-blur-md',
        'data-[hidden=true]:-translate-y-full',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-2.5 sm:px-6 xl:px-10">
        {children}
      </div>
    </header>
  );
}
