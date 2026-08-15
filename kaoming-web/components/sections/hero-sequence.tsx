'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * The load sequence from Part B.1 #7, in the form M1 can honestly deliver:
 * an accent hairline machines itself across the viewport, sweeps up as a light
 * pass revealing the machine, then the copy staggers in. No spinner, ever.
 *
 * The full version — real asset progress driving the line — belongs with the 3D
 * loader in M3, when there is finally something substantial to wait for. Here
 * the page is already complete when the sequence starts, so the sequence is
 * kept under a second and never gates content.
 *
 * `useGSAP` runs in a layout effect, so the starting state is written before the
 * browser paints: no flash of un-animated content. Under reduced motion nothing
 * is written at all and the hero is simply present (Part P).
 */
export function HeroSequence({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useSmoothScroll();

  useGSAP(
    () => {
      if (reducedMotion) return;

      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

      timeline
        .fromTo(
          '[data-hero-line]',
          { scaleX: 0, opacity: 1 },
          { scaleX: 1, duration: 0.55, ease: 'power2.inOut' },
        )
        // The line is the light pass, not a permanent red band across the page:
        // it sweeps up and out as the machine appears (Part B.1 #7).
        .to('[data-hero-line]', { opacity: 0, y: -14, duration: 0.5 }, '+=0.05')
        .fromTo(
          '[data-hero-machine]',
          { opacity: 0, y: 28, clipPath: 'inset(100% 0 0 0)' },
          { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)', duration: 0.9 },
          '-=0.1',
        )
        .fromTo(
          '[data-hero-copy] > *',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.09 },
          '-=0.65',
        )
        .fromTo('[data-hero-scroll]', { opacity: 0 }, { opacity: 1, duration: 0.4 }, '-=0.2');
    },
    { scope, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return (
    <div ref={scope} className="contents">
      {children}
    </div>
  );
}
