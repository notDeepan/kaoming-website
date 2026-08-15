'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * The horizontal timeline (Part J.3): vertical scroll drives horizontal motion,
 * the section pinned while it runs, a thin rule drawing itself as it goes.
 *
 * The tween that moves the track uses `ease: 'none'` — with `scrub` anything
 * else breaks the 1:1 mapping between how far the page has scrolled and how far
 * the timeline has travelled, which is the whole illusion.
 *
 * Under reduced motion nothing is pinned and nothing is scrubbed: the years
 * become an ordinary list that scrolls with the page (Part P). The years are in
 * the DOM either way, so this is a presentation of content, never its carrier.
 */
export function HistoryTimeline({
  years,
  events,
  paired,
  label,
}: {
  years: number[];
  events: string[];
  /** True only once KAO MING confirms which event belongs to which year. */
  paired: boolean;
  label: string;
}) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const rule = useRef<HTMLSpanElement>(null);
  const { reducedMotion } = useSmoothScroll();

  useGSAP(
    () => {
      if (reducedMotion) return;
      const element = track.current;
      if (!element) return;

      const distance = () => Math.max(0, element.scrollWidth - window.innerWidth + 96);

      const tween = gsap.to(element, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // The rule draws itself across as the years go past.
      const drawn = gsap.fromTo(
        rule.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            scrub: true,
          },
        },
      );

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        drawn.scrollTrigger?.kill();
        drawn.kill();
        ScrollTrigger.refresh();
      };
    },
    { scope: root, dependencies: [reducedMotion, years.length], revertOnUpdate: true },
  );

  return (
    <section
      ref={root}
      aria-label={label}
      data-timeline
      className={
        reducedMotion
          ? 'border-y border-km-steel-600/60 bg-km-charcoal py-20'
          : 'flex h-svh items-center overflow-hidden border-y border-km-steel-600/60 bg-km-charcoal'
      }
    >
      <div className="w-full">
        <div className="relative mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10">
          <span
            aria-hidden="true"
            className="absolute inset-x-5 top-[3.25rem] h-px bg-km-steel-600/50 sm:inset-x-6 xl:inset-x-10"
          />
          <span
            ref={rule}
            aria-hidden="true"
            className="absolute inset-x-5 top-[3.25rem] h-px origin-left bg-km-red sm:inset-x-6 xl:inset-x-10"
          />
        </div>

        <ol
          ref={track}
          className={
            reducedMotion
              ? 'mx-auto flex max-w-[1600px] flex-wrap gap-x-16 gap-y-10 px-5 pt-10 sm:px-6 xl:px-10'
              : 'flex gap-16 px-5 pt-10 sm:px-6 xl:px-10'
          }
        >
          {years.map((year, index) => (
            <li key={year} data-year={year} className="shrink-0">
              <span
                aria-hidden="true"
                className="mb-6 block size-2 rounded-full bg-km-red-glow"
              />
              <p className="km-display text-display-sm text-km-paper">{year}</p>
              {/* Only once the pairing is confirmed does a year carry an event. */}
              {paired && events[index] ? (
                <p className="mt-4 max-w-[34ch] text-body text-km-steel-400">{events[index]}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
