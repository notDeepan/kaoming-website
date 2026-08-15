'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * The one scroll behaviour M1 uses: content settles into place as it enters.
 *
 * `ScrollTrigger.batch` groups everything that crosses the line within a frame
 * into a single staggered tween, so a grid of cards reads as one movement
 * instead of eight independent ones. `once: true` — nothing re-animates on the
 * way back up, which is what makes a page feel restless.
 *
 * Under `prefers-reduced-motion` no tween is created and no starting state is
 * written, so the content is simply there (Part P).
 */
/** Only the wrappers this is used as. See the note on R3F's JSX augmentation. */
type RevealTag = 'div' | 'section' | 'ul' | 'ol' | 'dl';

export function Reveal({
  as: Tag = 'div',
  children,
  className = '',
  stagger = 0.08,
  y = 20,
}: {
  as?: RevealTag;
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
}) {
  const scope = useRef<HTMLElement | null>(null);
  const { reducedMotion } = useSmoothScroll();

  useGSAP(
    () => {
      if (reducedMotion) return;

      const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      if (!targets.length) return;

      // The pending state is written by script, never by the server: without
      // JavaScript, with reduced motion, or to a crawler the content is simply
      // visible. CSS hangs details like the drawn dimension rule off this.
      for (const target of targets) target.dataset.revealed = 'false';
      gsap.set(targets, { opacity: 0, y });

      ScrollTrigger.batch(targets, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => {
          for (const target of batch) (target as HTMLElement).dataset.revealed = 'true';
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger,
            overwrite: true,
          });
        },
      });
    },
    { scope, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        scope.current = node;
      }}
      className={className}
    >
      {children}
    </Tag>
  );
}
