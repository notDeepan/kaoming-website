'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * Part D: "numbers count up when scrolled into view".
 *
 * The final value is rendered on the server and is what a crawler, a reader
 * with reduced motion, and anyone whose JavaScript failed will see. The tween
 * only ever counts up to a number that is already in the HTML.
 */
export function Counter({
  value,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const { reducedMotion } = useSmoothScroll();
  const formatted = value.toLocaleString('en-US');

  useGSAP(
    () => {
      const element = ref.current;
      if (!element || reducedMotion) return;

      const counter = { current: 0 };
      const tween = gsap.to(counter, {
        current: value,
        duration: 1.6,
        ease: 'power2.out',
        paused: true,
        onUpdate: () => {
          element.textContent = Math.round(counter.current).toLocaleString('en-US');
        },
        onComplete: () => {
          element.textContent = formatted;
        },
      });

      const trigger = ScrollTrigger.create({
        trigger: element,
        start: 'top 90%',
        once: true,
        onEnter: () => tween.play(),
      });

      return () => {
        trigger.kill();
        tween.kill();
      };
    },
    { dependencies: [value, reducedMotion], revertOnUpdate: true },
  );

  return (
    <span className={className}>
      {prefix}
      <span ref={ref}>{formatted}</span>
      {suffix}
    </span>
  );
}
