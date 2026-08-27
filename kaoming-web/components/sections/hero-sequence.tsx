'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * The machine statement's entrance: the machine wipes up, then the copy staggers
 * in behind it.
 *
 * This began as the page's load sequence (Part B.1 #7) — an accent hairline
 * machining itself across the viewport as a light pass. That belonged to a page
 * that opened here. The landing page now opens on the plant, so the hairline and
 * the scroll cue went with it and what remains is a reveal, not an overture.
 *
 * `useGSAP` runs in a layout effect, so the starting state is written before the
 * browser paints: no flash of un-animated content. Under reduced motion nothing
 * is written at all and the section is simply present (Part P).
 */
export function HeroSequence({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useSmoothScroll();

  useGSAP(
    () => {
      if (reducedMotion) return;

      const timeline = gsap.timeline({
        defaults: { ease: 'power3.out' },
        // It is below the fold now, so it plays when it is reached rather than
        // on load — otherwise it is over before anyone sees it.
        scrollTrigger: { trigger: scope.current, start: 'top 78%', once: true },
      });

      timeline
        .fromTo(
          '[data-hero-machine]',
          { opacity: 0, y: 28, clipPath: 'inset(100% 0 0 0)' },
          { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)', duration: 0.9 },
        )
        .fromTo(
          '[data-hero-copy] > *',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.09 },
          '-=0.65',
        );
    },
    { scope, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  // Not `contents`: ScrollTrigger needs a box to measure, and a `display:
  // contents` element has none.
  return <div ref={scope}>{children}</div>;
}
