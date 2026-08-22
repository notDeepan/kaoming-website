'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';
import type { Milestone } from '@/lib/company';

/**
 * The horizontal timeline (Part J.3): vertical scroll drives horizontal motion,
 * the section pinned while it runs, a rule drawing itself as it goes.
 *
 * This used to print the years with nothing under them, because the pairing was
 * unconfirmed and ten years beside ten milestones would have been a guess. The
 * pairing has since been recovered from the source page's own stored layout (see
 * lib/company), so each year now carries the milestone that belongs to it — and
 * the component that was a row of dates is a timeline.
 *
 * The tween that moves the track uses `ease: 'none'` — with `scrub` anything
 * else breaks the 1:1 mapping between how far the page has scrolled and how far
 * the timeline has travelled, which is the whole illusion.
 *
 * Under reduced motion nothing is pinned and nothing is scrubbed: the milestones
 * become an ordinary vertical list (Part P). Everything is in the DOM either
 * way, in order, so this is a presentation of the record and never its carrier.
 */
export function HistoryTimeline({
  milestones,
  illustrations,
  label,
  hint,
}: {
  milestones: Milestone[];
  /** Year -> photograph. Illustration chosen from _kit/factory, not evidence. */
  illustrations: Record<number, { src: string; alt: string }>;
  label: string;
  hint: string;
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
    { scope: root, dependencies: [reducedMotion, milestones.length], revertOnUpdate: true },
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
        {!reducedMotion ? (
          <p className="km-label mx-auto mb-10 flex max-w-[1600px] items-center gap-4 px-5 text-km-steel-400 sm:px-6 xl:px-10">
            <span aria-hidden="true" className="h-px w-10 shrink-0 bg-km-red sm:w-16" />
            {hint}
          </p>
        ) : null}

        {/* The spine. Two rules stacked: the full-width hairline the entries
            hang from, and the red one that draws itself in over it. */}
        <div className="relative mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10">
          <span
            aria-hidden="true"
            className="absolute inset-x-5 top-[0.4375rem] h-px bg-km-steel-600/50 sm:inset-x-6 xl:inset-x-10"
          />
          <span
            ref={rule}
            aria-hidden="true"
            className="absolute inset-x-5 top-[0.4375rem] h-px origin-left bg-km-red sm:inset-x-6 xl:inset-x-10"
          />
        </div>

        <ol
          ref={track}
          className={
            reducedMotion
              ? 'mx-auto flex max-w-[1600px] flex-col gap-12 px-5 pt-10 sm:px-6 xl:px-10'
              : 'flex items-start gap-12 px-5 pt-4 sm:px-6 xl:px-10'
          }
        >
          {milestones.map((milestone) => {
            const illustration = illustrations[milestone.year];
            return (
              <li
                key={milestone.year}
                data-year={milestone.year}
                data-milestone
                className={
                  reducedMotion
                    ? 'border-t border-km-steel-600/60 pt-6'
                    : 'w-[19rem] shrink-0 sm:w-[22rem]'
                }
              >
                <span
                  aria-hidden="true"
                  className="mb-6 block size-3.5 rounded-full border-2 border-km-charcoal bg-km-red-glow"
                />
                <p className="font-display text-h2 text-km-paper">{milestone.year}</p>
                <p className="mt-4 text-body text-km-steel-400">{milestone.text}</p>

                {illustration ? (
                  <div className="relative mt-6 aspect-4/3 overflow-hidden border border-km-steel-600/60">
                    <Image
                      src={illustration.src}
                      alt={illustration.alt}
                      fill
                      sizes="(min-width: 640px) 22rem, 19rem"
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
