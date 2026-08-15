'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * The factory journey (Part J.2): full-bleed photography, parallax, wipe
 * reveals, mono step indices.
 *
 * The parallax moves the image inside a fixed frame rather than moving the frame
 * itself, so nothing ever shifts the page's layout — the whole point of the
 * effect is that the picture drifts while the type stays put.
 *
 * `yPercent` on the image and a scaled wrapper: transforming a scaled child
 * keeps the frame filled at every scroll position, which a plain translate does
 * not. Under reduced motion the images sit still and the captions are simply
 * there (Part P).
 */

/**
 * Captions arrive resolved. A Server Component cannot hand a client one a
 * translation function, and it should not: the copy is content, and content
 * belongs in the payload rather than in a callback the client has to invoke.
 */
export type FactoryStep = {
  id: string;
  image: { src: string; width: number; height: number } | null;
  title: string;
  copy: string;
};

export function FactoryJourney({ steps }: { steps: FactoryStep[] }) {
  const root = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useSmoothScroll();

  useGSAP(
    () => {
      if (reducedMotion) return;

      for (const frame of gsap.utils.toArray<HTMLElement>('[data-parallax]')) {
        gsap.fromTo(
          frame.querySelector('img'),
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      }

      // The wipe: each caption's rule draws in as the step arrives.
      for (const rule of gsap.utils.toArray<HTMLElement>('[data-wipe]')) {
        gsap.fromTo(
          rule,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: rule, start: 'top 85%', once: true },
          },
        );
      }

      return () => {
        for (const trigger of ScrollTrigger.getAll()) {
          if (root.current?.contains(trigger.trigger as Node)) trigger.kill();
        }
      };
    },
    { scope: root, dependencies: [reducedMotion, steps.length], revertOnUpdate: true },
  );

  return (
    <div ref={root}>
      {steps.map((step, index) => {
        if (!step.image) return null;

        return (
          <section key={step.id} data-factory-step={step.id} className="border-t border-km-steel-600/60">
            <div
              data-parallax
              className="relative h-[62svh] w-full overflow-hidden bg-km-charcoal sm:h-[78svh]"
            >
              <Image
                src={step.image.src}
                alt={step.title}
                fill
                sizes="100vw"
                priority={index === 0}
                className="scale-115 object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-km-black via-km-black/30 to-transparent"
              />
            </div>

            <div className="mx-auto -mt-24 max-w-[1600px] px-5 pb-20 sm:px-6 xl:px-10">
              <div className="relative max-w-[52ch]">
                <span className="km-label text-km-red-glow">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  data-wipe
                  aria-hidden="true"
                  className="mt-4 block h-px w-full origin-left bg-km-red"
                />
                <h2 className="km-display mt-6 text-display-xs text-km-paper">{step.title}</h2>
                <p className="mt-4 text-body text-km-steel-400">{step.copy}</p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
