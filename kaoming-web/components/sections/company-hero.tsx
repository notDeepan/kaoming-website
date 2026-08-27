'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Action } from '@/components/ui/action';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * The company hero — the first thing anyone now sees.
 *
 * The site used to open on a machine. That is the right opening for a product
 * page and the wrong one for a landing page: a buyer arriving cold wants to know
 * who this is before they are sold a gantry. So the page opens on the plant, at
 * full bleed, with KAO MING's own founding line over it, and the machines follow
 * directly underneath.
 *
 * **A photograph is its own environment.** Everything else on this site inverts
 * with the theme; this section deliberately does not. The scrim is dark and the
 * type is light in both themes, because the alternative — a light scrim over a
 * bright sky with dark type — has no contrast to give and changes the photograph
 * into a wash. `km-on-brand` is the one type colour that is constant in both
 * themes, which is exactly why it exists.
 *
 * **The header.** It is transparent until 80px of scroll, which means it sits
 * over this photograph in its own colours — and in the light theme those are
 * dark ink. `data-media-hero` on the document is what tells it otherwise; see
 * the rule in app/globals.css. It is set from an effect and removed on unmount,
 * so it is scoped to this page and cannot leak into a client navigation.
 *
 * **Motion.** The photograph drifts at a fraction of the scroll rate and the
 * copy lifts and fades as the section leaves — one scrubbed transform each, no
 * per-frame work of our own. Under `prefers-reduced-motion` neither is created
 * and the hero is simply a photograph with words on it (Part P).
 */
export function CompanyHero({
  src,
  eyebrow,
  title,
  body,
  alt,
  primary,
  secondary,
  scroll,
}: {
  src: string;
  eyebrow: string;
  title: string;
  body: string;
  alt: string;
  primary: string;
  secondary: string;
  scroll: string;
}) {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion } = useSmoothScroll();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mediaHero = 'true';
    return () => {
      delete root.dataset.mediaHero;
    };
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;

      const photo = gsap.to('[data-hero-photo]', {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });

      const copy = gsap.to('[data-hero-copy]', {
        y: -60,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          // Gone by two-thirds, so the words are not still fading over the
          // section that follows.
          end: '66% top',
          scrub: true,
        },
      });

      // The entrance. Not a load sequence — the photograph is already there —
      // just the words arriving on it.
      const entrance = gsap.from('[data-hero-copy] > *', {
        opacity: 0,
        y: 24,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
      });

      return () => {
        photo.scrollTrigger?.kill();
        photo.kill();
        copy.scrollTrigger?.kill();
        copy.kill();
        entrance.kill();
        ScrollTrigger.refresh();
      };
    },
    { scope: root, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return (
    <section
      ref={root}
      data-company-hero
      className="relative flex min-h-[36rem] items-end overflow-hidden lg:h-svh"
    >
      {/* Over-scaled so the parallax has somewhere to travel without exposing an
          edge. `object-cover` with a bottom bias keeps the building in frame as
          the crop changes with the viewport. */}
      <div data-hero-photo className="absolute inset-0 scale-115">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_60%]"
        />
      </div>

      {/*
       * The scrim, in fixed values rather than tokens — see the note above about
       * a photograph being its own environment. Heavy at the bottom where the
       * words are, heavy again at the very top where the header sits, and
       * thinnest across the middle where the building actually is.
       */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,7,6,0.78)_0%,rgba(8,7,6,0.34)_18%,rgba(8,7,6,0.18)_42%,rgba(8,7,6,0.62)_74%,rgba(8,7,6,0.92)_100%)]"
      />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 pt-40 pb-14 sm:px-6 sm:pb-20 xl:px-10">
        <div data-hero-copy>
          <p className="km-label flex items-center gap-4 text-km-on-brand/75">
            <span aria-hidden="true" className="h-px w-10 shrink-0 bg-km-red sm:w-16" />
            {eyebrow}
          </p>

          <h1 className="mt-8 max-w-[17ch] text-hero text-km-on-brand uppercase">{title}</h1>

          <p className="mt-8 max-w-[54ch] text-body text-km-on-brand/80">{body}</p>

          {/* The machines, then a person. An opening frame's job is to send a
              visitor somewhere, and on a machine-tool site those are the only
              two places worth sending them. */}
          <div className="mt-12 flex flex-wrap gap-4">
            <Action href="/products" variant="primary">
              {primary}
            </Action>
            {/* Not the shared `secondary` variant: that one fills with the body
                text colour and letters itself in the page field, which over a
                photograph is a white block. Over media it is a hairline. */}
            <Action href="/support/contact" variant="onMedia">
              {secondary}
            </Action>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3 sm:mt-16">
          <span className="km-label text-km-on-brand/70">{scroll}</span>
          <span aria-hidden="true" className="h-px w-12 bg-km-on-brand/40" />
        </div>
      </div>
    </section>
  );
}
