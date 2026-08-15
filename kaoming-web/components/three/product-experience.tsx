'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';
import { featuresForScene } from '@/lib/features';
import type { Series } from '@/lib/machines';
import { modelFor } from '@/lib/three/models';
import { detectTier, LADDER, type QualityStep, type QualityTier } from '@/lib/three/quality';
import { ScrollStateContext, useCreateSceneScroll } from '@/lib/three/scroll-state';
import type { CameraRigHandle } from './camera-rig';
import { ComponentScenes, LeaderLine } from './component-scenes';
import { FeatureCard } from './feature-cards';

/**
 * Scenes 01 → 03 on one canvas (Part C.3: one persistent Canvas per 3D page,
 * never two fighting for a context).
 *
 * The canvas is sticky inside a tall scroll container. Scene 01 is the first
 * screen; Scene 02 is entered by choice and hands the camera to the visitor;
 * Scene 03 is the rest of the container, where scroll drives the camera along
 * its orbit and the feature cards come past in sync.
 *
 * Lenis owns the scroll and ScrollTrigger reads from it (wired in lib/motion),
 * so there is exactly one scroll authority on the page.
 */

/**
 * three, r3f, drei and postprocessing arrive here and nowhere else.
 *
 * Part O caps initial JS at 300 KB per route, and this bundle is 600 KB on its
 * own. `next/dynamic` only fetches it when the component is first rendered — but
 * that guarantee is only as good as the module graph around it, and it is
 * fragile: importing a single named export from drei at the top of this file
 * (`useProgress`, which is what was here) pulls the entire stack into the
 * initial bundle and quietly costs 2.5 seconds of script evaluation on a page
 * whose first paint is supposed to be a photograph.
 *
 * So nothing in this file may import from three, drei or r3f — not even a
 * helper, not even a hook. Loading progress is reported by the scene through
 * `onProgress` instead.
 */
const MachineScene = dynamic(
  () => import('./machine-scene').then((module) => module.MachineScene),
  { ssr: false },
);

export function ProductExperience({
  series,
  fallbackImage,
}: {
  series: Series;
  fallbackImage: { src: string; width: number; height: number } | null;
}) {
  const t = useTranslations('Viewer');
  const { reducedMotion } = useSmoothScroll();
  const scroll = useCreateSceneScroll();

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLDivElement>(null);
  const explodeRange = useRef<HTMLDivElement>(null);
  const rig = useRef<CameraRigHandle>(null);
  /** Read inside a ScrollTrigger callback, so they have to be refs. */
  const manualExplode = useRef(false);
  const explodeTracked = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  /** 0–100, reported by the scene. Stays at 0 where there is no model to load. */
  const [progress, setProgress] = useState(0);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [interactive, setInteractive] = useState(false);
  const [scrubbed, setScrubbed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [tier, setTier] = useState<QualityTier>('med');
  const [step, setStep] = useState<QualityStep>('full');
  const [pinned, setPinned] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [openComponent, setOpenComponent] = useState<string | null>(null);

  const features = featuresForScene(series);
  const components = series.components;
  const activeObject =
    components.find((component) => component.id === activeComponent)?.object ?? null;
  const hasModel = Boolean(modelFor(series.slug));

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      setWebgl(Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl')));
    } catch {
      setWebgl(false);
    }

    /**
     * A scan from booth signage or a printed catalogue (Part J.7). Read here
     * rather than on the server: touching `searchParams` in a Server Component
     * makes the route dynamic, which on this site silently voids page metadata.
     *
     * The spec asks for LOW tier and an instant open, and it is right to — this
     * is a phone held up in a hall, on hall wifi, by someone standing in front
     * of the real machine. Detection would probably choose LOW anyway; pinning
     * it means the visitor never watches the ladder walk down to get there.
     */
    const scanned = new URLSearchParams(window.location.search).get('qr') === '1';
    if (scanned) {
      setTier('low');
      setPinned(true);
      track({ name: 'qr_entry', model: series.slug });
      return;
    }

    setTier(detectTier());
  }, [series.slug]);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;

    /**
     * When the canvas is allowed to mount.
     *
     * Three conditions, and the order they were arrived at is the point:
     *
     *  1. **The page has loaded.** `readyState === 'complete'` is the condition
     *     that matters: it keeps 600 KB of script out of the window the hero
     *     photograph is competing in. Measured before it existed, the LCP
     *     element was downloaded at 485ms and painted at 3.7s, and every one of
     *     those three seconds was render delay behind script evaluation.
     *  2. **The browser is idle.** Cheap, and it keeps the mount off the tail of
     *     the load event.
     *  3. **The stage is within a screen of the viewport.** A margin, not zero.
     *     Zero is tempting and wrong: the stage sits ~90px below the fold, so a
     *     visitor who scrolls one notch would arrive at an empty frame and
     *     *then* start a 600 KB download. The margin decides how early after
     *     load the fetch begins; it does not affect the LCP, because the load
     *     gate above already does.
     *
     * Part B.1 asks for first paint to be text and a poster, never the 3D. This
     * is what makes that true rather than intended.
     */
    let scheduled = 0;
    const mount = () => {
      scheduled = window.requestIdleCallback
        ? window.requestIdleCallback(() => setMounted(true), { timeout: 2000 })
        : window.setTimeout(() => setMounted(true), 200);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !scheduled) {
          if (document.readyState === 'complete') mount();
          else window.addEventListener('load', mount, { once: true });
        }
        setActive(entry.isIntersecting && document.visibilityState === 'visible');
      },
      { rootMargin: '800px' },
    );
    observer.observe(element);

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') setActive(false);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /**
   * Part Q's two ENGAGEMENT entry events.
   *
   * `product_viewed` is the denominator for every ratio on that dashboard —
   * exploration depth, 3D interaction rate, exploded-view completion are all
   * "of the people who looked at this machine". `3d_opened` is the moment the
   * canvas actually exists, which since M8 is not the moment the page loads.
   */
  useEffect(() => {
    track({ name: 'product_viewed', series: series.slug, category: series.categorySlug });
  }, [series.slug, series.categorySlug]);

  useEffect(() => {
    if (!mounted) return;
    track({ name: '3d_opened', series: series.slug });
  }, [mounted, series.slug]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /**
   * Scene 03. ScrollTrigger writes raw progress into the shared ref; the render
   * loop eases it and reads the camera off the curve. No tween is created for
   * the camera itself, which is what keeps scrubbing identical in both
   * directions — there is no playhead to fight.
   *
   * Under reduced motion nothing is created at all: the cards become a plain
   * stacked list and the camera stays at the hero angle (Part P).
   */
  useGSAP(
    () => {
      if (reducedMotion) return;

      const triggers: ScrollTrigger[] = [];

      if (features.length) {
        triggers.push(
          ScrollTrigger.create({
            trigger: cards.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            onUpdate: (self) => {
              scroll.current.target = self.progress;
            },
          }),
        );
      }

      // Scenes 04–06 are one range, not three: the disassembly, the reading and
      // the reassembly are a single function of where the page is (see
      // lib/three/rig — explodeState). One trigger is all that needs to exist.
      if (components.length) {
        triggers.push(
          ScrollTrigger.create({
            trigger: explodeRange.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            onUpdate: (self) => {
              if (manualExplode.current) return;
              scroll.current.explodeTarget = self.progress;
              if (self.progress > 0.02 && !explodeTracked.current) {
                explodeTracked.current = true;
                track({ name: 'exploded_started', series: series.slug });
              }
            },
          }),
        );
      }

      // The cards are DOM, so they get an ordinary reveal rather than being
      // scrubbed — a panel that slides back out as you scroll up reads as a
      // glitch, not as choreography.
      const panels = gsap.utils.toArray<HTMLElement>('[data-feature-panel]');
      gsap.set(panels, { opacity: 0, y: 24 });
      for (const panel of panels) {
        ScrollTrigger.create({
          trigger: panel,
          start: 'top 78%',
          once: true,
          onEnter: () =>
            gsap.to(panel, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }),
        });
      }

      return () => {
        for (const trigger of triggers) trigger.kill();
      };
    },
    {
      scope: root,
      dependencies: [reducedMotion, features.length, components.length],
      revertOnUpdate: true,
    },
  );

  /**
   * The Part G.2 control, for anyone who would rather press a button than
   * scroll — and the only way to see the machine open under reduced motion,
   * where no scroll choreography is created at all.
   *
   * 0.5 is the middle of the range, which `explodeState` holds fully apart.
   */
  const toggleExploded = useCallback(() => {
    setExploded((current) => {
      const next = !current;
      manualExplode.current = next;
      scroll.current.explodeTarget = next ? 0.5 : 0;
      if (next && !explodeTracked.current) {
        explodeTracked.current = true;
        track({ name: 'exploded_started', series: series.slug });
      }
      return next;
    });
  }, [scroll, series.slug]);

  const demote = useCallback(() => {
    setStep((current) => LADDER[Math.min(LADDER.indexOf(current) + 1, LADDER.length - 1)]);
  }, []);

  const enterInspection = useCallback(() => {
    setInteractive(true);
    track({ name: '3d_interacted', series: series.slug });
  }, [series.slug]);

  const showCanvas = webgl === true && step !== 'static';
  const loaded = hasModel ? progress >= 100 && ready : ready;
  // Scene 03 owns the camera the moment scrolling starts, so Scene 02's manual
  // controls only apply while the visitor is still at the top.
  const manualAllowed = interactive && !scrubbed;

  return (
    <ScrollStateContext value={scroll}>
      <section
        ref={root}
        aria-label={t('title', { machine: series.name })}
        data-quality-step={step}
        data-quality-tier={tier}
        data-webgl={webgl === null ? 'unknown' : String(webgl)}
        data-scrubbed={String(scrubbed)}
        className="relative border-y border-km-steel-600/60 bg-km-black"
      >
        {/* The stage stays put while the cards scroll past it. Under reduced
            motion it is a plain block and the page scrolls normally. */}
        <div
          ref={stage}
          className={`${reducedMotion ? 'relative' : 'sticky top-0'} h-svh w-full overflow-hidden`}
        >
          {showCanvas && mounted ? (
            <MachineScene
              slug={series.slug}
              tier={tier}
              step={step}
              pinned={pinned}
              interactive={manualAllowed}
              autoRotate={autoRotate && !reducedMotion}
              reducedMotion={reducedMotion}
              active={active}
              activeObject={activeObject}
              onDemote={demote}
              rigRef={rig}
              onReady={() => setReady(true)}
              onProgress={setProgress}
              onScrubbedChange={setScrubbed}
            />
          ) : null}

          {/* Part G.5 — the hairline from a component's row to where that part
              actually is in the exploded machine. */}
          {showCanvas && !reducedMotion && components.length ? (
            <LeaderLine
              scroll={scroll}
              active={activeComponent}
              components={components}
              stage={stage}
            />
          ) : null}

          {!showCanvas && fallbackImage ? (
            <Image
              src={fallbackImage.src}
              alt={t('fallbackAlt', { machine: series.name })}
              fill
              sizes="100vw"
              className="object-contain"
            />
          ) : null}

          {showCanvas ? <LoadSequence done={loaded} reducedMotion={reducedMotion} /> : null}

          {showCanvas && !hasModel ? (
            <p className="km-label absolute start-4 top-4 z-2 border border-km-warning/60 bg-km-black/80 px-3 py-2 text-km-warning">
              {t('placeholder')}
            </p>
          ) : null}

          {showCanvas && !interactive && loaded && !scrubbed ? (
            <button
              type="button"
              onClick={enterInspection}
              className="km-label absolute inset-x-0 bottom-16 z-2 flex min-h-14 items-center justify-center gap-3 text-km-offwhite"
            >
              {t('explore')}
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none">
                <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          ) : null}

          {/* The scrim is decoration and must not eat clicks: it sits over the
              Explore affordance, and without `pointer-events-none` the button is
              dead along its lower edge. The strip takes pointer events back. */}
          {showCanvas ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 bg-gradient-to-t from-km-black/95 to-transparent pt-8 [&>*]:pointer-events-auto">
              <ControlStrip
                interactive={manualAllowed}
                autoRotate={autoRotate}
                reducedMotion={reducedMotion}
                fullscreen={fullscreen}
                tier={tier}
                pinned={pinned}
                exploded={exploded}
                canExplode={components.length > 0}
                onToggleExploded={toggleExploded}
                onReset={() => rig.current?.reset()}
                onToggleAutoRotate={() => setAutoRotate((value) => !value)}
                onToggleFullscreen={() => {
                  if (document.fullscreenElement) void document.exitFullscreen();
                  else void stage.current?.requestFullscreen?.();
                }}
                onTier={(next) => {
                  setTier(next);
                  setStep('full');
                  setPinned(true);
                }}
              />
            </div>
          ) : null}
        </div>

        {/* Scenes 03 → 06 all scroll over the one sticky stage above. Under
            reduced motion the stage is a plain block and these simply follow it
            down the page as ordinary sections. */}
        <div className={reducedMotion ? 'relative' : '-mt-svh'}>
          {/* Scene 03. One screen of scroll per feature; the cards alternate
              sides as the camera comes round. */}
          {features.length ? (
            <div ref={cards}>
              {features.map((feature, index) => (
                <FeatureCard
                  key={feature.id}
                  index={index}
                  total={features.length}
                  title={feature.title}
                  copy={feature.copy}
                />
              ))}
            </div>
          ) : null}

          {/* Scenes 04–06. Only where the catalogue names components: a machine
              whose components have not been transcribed gets no exploded view
              rather than an invented one. */}
          {components.length ? (
            <div ref={explodeRange}>
              <ComponentScenes
                components={components}
                active={activeComponent}
                open={openComponent}
                onActive={setActiveComponent}
                onOpen={setOpenComponent}
                series={series.slug}
                reducedMotion={reducedMotion}
              />
            </div>
          ) : null}
        </div>
      </section>
    </ScrollStateContext>
  );
}

/**
 * Part B.1 #7 — black, then a 1px accent line machines itself across the frame
 * and sweeps up as a light pass revealing the machine. Never a spinner.
 */
function LoadSequence({ done, reducedMotion }: { done: boolean; reducedMotion: boolean }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!done) return;
    if (reducedMotion) {
      setGone(true);
      return;
    }
    const timer = setTimeout(() => setGone(true), 640);
    return () => clearTimeout(timer);
  }, [done, reducedMotion]);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-3 bg-km-black transition-[opacity,transform] duration-500 ease-(--ease-km) ${
        done ? '-translate-y-full opacity-0' : 'opacity-100'
      }`}
    >
      <span
        className={`absolute inset-x-0 top-1/2 h-px origin-left bg-km-red transition-transform duration-700 ease-(--ease-km) ${
          done ? 'scale-x-100' : 'scale-x-0'
        }`}
      />
    </div>
  );
}

/** Part G.2 — the control strip. Mono labels, keyboard reachable. */
function ControlStrip({
  interactive,
  autoRotate,
  reducedMotion,
  fullscreen,
  tier,
  pinned,
  exploded,
  canExplode,
  onToggleExploded,
  onReset,
  onToggleAutoRotate,
  onToggleFullscreen,
  onTier,
}: {
  interactive: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  fullscreen: boolean;
  tier: QualityTier;
  pinned: boolean;
  exploded: boolean;
  canExplode: boolean;
  onToggleExploded: () => void;
  onReset: () => void;
  onToggleAutoRotate: () => void;
  onToggleFullscreen: () => void;
  onTier: (tier: QualityTier) => void;
}) {
  const t = useTranslations('Viewer');

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2">
      <Control onClick={onReset} disabled={!interactive}>
        {t('reset')}
      </Control>

      {/* The exploded view. Disabled only where the catalogue names no
          components — an honest "there is nothing to take apart here" rather
          than a control that does nothing. */}
      <Control
        onClick={onToggleExploded}
        pressed={exploded}
        disabled={!canExplode}
        title={canExplode ? undefined : t('explodedUnavailable')}
      >
        {t('exploded')}
      </Control>

      <Control
        onClick={onToggleAutoRotate}
        pressed={autoRotate && !reducedMotion}
        disabled={reducedMotion}
        title={reducedMotion ? t('autoRotateReduced') : undefined}
      >
        {t('autoRotate')}
      </Control>

      <Control onClick={onToggleFullscreen} pressed={fullscreen}>
        {t('fullscreen')}
      </Control>

      <div className="ms-auto flex items-center gap-2">
        <span className="km-label text-km-steel-400">{t('quality')}</span>
        {(['low', 'med', 'high'] as const).map((option) => (
          <Control key={option} onClick={() => onTier(option)} pressed={pinned && tier === option}>
            {t(`tier.${option}`)}
          </Control>
        ))}
      </div>
    </div>
  );
}

function Control({
  children,
  onClick,
  disabled = false,
  pressed,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={pressed}
      className={`km-label min-h-11 px-3 transition-colors duration-(--duration-km) ease-(--ease-km) disabled:opacity-40 ${
        pressed ? 'text-km-blue' : 'text-km-steel-400 hover:text-km-offwhite'
      }`}
    >
      {children}
    </button>
  );
}
