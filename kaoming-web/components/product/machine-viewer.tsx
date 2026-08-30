'use client';

import dynamic from 'next/dynamic';
import { useWindowView } from '@/components/product/window-view';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';
import type { MachineComponent } from '@/lib/machines';
import { modelFor } from '@/lib/three/models';
import { detectTier, LADDER, type QualityStep, type QualityTier } from '@/lib/three/quality';
import { ScrollStateContext, useCreateSceneScroll } from '@/lib/three/scroll-state';
import type { PlateImage } from '@/components/ui/machine-plate';
import type { CameraRigHandle } from '@/components/three/camera-rig';

/**
 * The 3D view, inside the machine window.
 *
 * **What this replaced.** The 3D used to be six scroll-scrubbed scenes down the
 * product page: the camera flew a scripted path, the machine came apart, the
 * component panels arrived in sequence. That belonged to a page you scrolled.
 * The machine window does not scroll — it is a fixed panel with a close button —
 * so a scroll-driven camera has nothing to be driven by.
 *
 * So the same scene, the same explode rig and the same QualityManager are here
 * without the choreography: the visitor drags the machine, the controls take it
 * apart, and nothing depends on a scroll position. Everything Part O asks for
 * still applies — the loop stops when the view is hidden, the watchdog walks the
 * ladder, and a device without WebGL gets the photograph.
 *
 * Nothing in this file may import from three, drei or r3f. The scene is loaded
 * on demand so the 3D stack is not in the bundle of anyone who never opens it.
 */

const MachineScene = dynamic(
  () => import('@/components/three/machine-scene').then((module) => module.MachineScene),
  { ssr: false },
);

export function MachineViewer({
  slug,
  machine,
  components,
  fallback,
}: {
  slug: string;
  machine: string;
  components: MachineComponent[];
  /** Studio photograph, shown where WebGL is unavailable or the ladder gave up. */
  fallback: PlateImage | null;
}) {
  const t = useTranslations('Viewer');
  /* Component rows are keyed under `Component.spec`, not `Spec`: a component's
     figures are the catalogue's words for that part — `cts`, `aAxisRotation` —
     and are not the machine-level specification labels. `has` guards the ones a
     transcription carries that no message names yet; the raw key is a worse
     label than the key itself is a bug. */
  const tComponent = useTranslations('Component.spec');
  const { reducedMotion } = useSmoothScroll();
  const scroll = useCreateSceneScroll();

  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [tier, setTier] = useState<QualityTier>('med');
  const [step, setStep] = useState<QualityStep>('full');
  const [pinned, setPinned] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [openComponent, setOpenComponent] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

  const stage = useRef<HTMLDivElement>(null);
  const rig = useRef<CameraRigHandle>(null);
  const [fullscreen, setFullscreen] = useState(false);

  /* Every pane of the window is in the document, so this component renders for
     a visitor who never opens the 3D. Detection is what commits us — it decides
     `showCanvas`, and a canvas is a WebGL context, a model download and a render
     loop. So it waits until this pane is the selected one. `useWindowView`
     returns null outside a window, where the viewer is the whole point of the
     route and there is nothing to wait for. */
  const windowView = useWindowView();
  const inPane = windowView === null || windowView.view === 'viewer';

  // Detection and the starting tier, once. `detectTier` reads the GPU name,
  // which costs a throwaway context, so it is not something to do per render.
  useEffect(() => {
    if (!inPane) return;
    setMounted(true);
    try {
      const canvas = document.createElement('canvas');
      setWebgl(Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl')));
    } catch {
      setWebgl(false);
    }
    /* A code scanned in an exhibition hall: a phone, hall wifi, and someone
       standing in front of the real machine. Part J.7 asks for the LOW tier and
       an instant open — detection would very likely choose LOW anyway, and
       pinning it means the visitor never watches the ladder walk down to it. */
    if (new URLSearchParams(window.location.search).get('qr') === '1') {
      setTier('low');
      setPinned(true);
      track({ name: 'qr_entry', model: slug });
      return;
    }

    setTier(detectTier());
  }, [inPane, slug]);

  // The loop runs only while the panel is actually on screen and the tab is
  // visible. In a window that can be switched away from, this is not a nicety.
  const [active, setActive] = useState(true);
  useEffect(() => {
    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const demote = useCallback(() => {
    setStep((current) => LADDER[Math.min(LADDER.indexOf(current) + 1, LADDER.length - 1)]);
  }, []);

  const toggleExploded = useCallback(() => {
    setExploded((current) => {
      const next = !current;
      // 0.5 is the middle of the rig's range, which holds it fully apart.
      scroll.current.explodeTarget = next ? 0.5 : 0;
      if (next) track({ name: 'exploded_started', series: slug });
      return next;
    });
  }, [scroll, slug]);

  const hasModel = Boolean(modelFor(slug));
  const canExplode = components.length > 0;
  const showCanvas = webgl === true && step !== 'static';
  const loaded = hasModel ? progress >= 100 && ready : ready;

  return (
    <ScrollStateContext value={scroll}>
      <div
        data-machine-viewer
        /* What the DOM says is being pointed at. The canvas follows this; it is
           never the other way round, which is what makes the component list the
           authority and the 3D the illustration (Part 0.4). */
        data-active-component={activeComponent ?? ''}
        /* The model is downloaded when this pane opens, not when the page does,
           so "the machine is on screen" is a state a test has to be able to wait
           for rather than sleep past. */
        data-viewer-ready={String(loaded)}
        data-quality-step={step}
        data-quality-tier={tier}
        data-webgl={webgl === null ? 'unknown' : String(webgl)}
        className="flex h-full min-h-0 flex-col"
      >
        <div
          ref={stage}
          className="relative min-h-0 flex-1 overflow-hidden border border-km-steel-600/60 bg-km-black"
        >
          {showCanvas && mounted ? (
            <MachineScene
              slug={slug}
              tier={tier}
              step={step}
              pinned={pinned}
              interactive
              autoRotate={autoRotate && !reducedMotion}
              reducedMotion={reducedMotion}
              active={active}
              activeObject={activeComponent}
              onDemote={demote}
              rigRef={rig}
              onReady={() => setReady(true)}
              onProgress={setProgress}
            />
          ) : null}

          {/* The photograph, wherever the scene cannot run. Not a placeholder —
              it is the same studio plate the rest of the site shows, and it is
              the honest answer for a device that has no WebGL at all. */}
          {!showCanvas && fallback ? (
            <Image
              src={fallback.src}
              alt={t('fallbackAlt', { machine })}
              fill
              sizes="(min-width: 1024px) 70vw, 92vw"
              className="object-contain p-6"
            />
          ) : null}

          {webgl === false ? (
            <p className="km-label absolute inset-x-6 bottom-6 text-km-steel-400">
              {t('noWebgl')}
            </p>
          ) : null}

          {/* The geometry is a dimensioned blockout, not the machine. It says so
              on itself, always, because a grey box that does not is a lie about
              what KAO MING builds (CLAUDE.md). */}
          {showCanvas && !hasModel ? (
            <p className="km-label absolute inset-x-6 top-6 text-km-warning">{t('placeholder')}</p>
          ) : null}

          {showCanvas && !loaded ? (
            <p className="km-label absolute inset-x-6 top-6 text-km-steel-400">
              {Math.round(progress)}%
            </p>
          ) : null}
        </div>

        {/* ------------------------------------------------------- controls */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Control onClick={() => rig.current?.reset()} disabled={!showCanvas}>
            {t('reset')}
          </Control>

          <Control
            onClick={toggleExploded}
            pressed={exploded}
            disabled={!canExplode || !showCanvas}
            title={canExplode ? undefined : t('explodedUnavailable')}
          >
            {t('exploded')}
          </Control>

          <Control
            onClick={() => setAutoRotate((value) => !value)}
            pressed={autoRotate && !reducedMotion}
            disabled={reducedMotion || !showCanvas}
            title={reducedMotion ? t('autoRotateReduced') : undefined}
          >
            {t('autoRotate')}
          </Control>

          {/* Fullscreen is the stage filling the window rather than the browser
              filling the screen: the window is already the whole viewport, so
              the Fullscreen API would only remove the frame the visitor needs to
              get back out of. This hides the controls and the component list and
              gives the machine the height they were using. */}
          <Control onClick={() => setFullscreen((value) => !value)} pressed={fullscreen}>
            {t('fullscreen')}
          </Control>

          <div className="ms-auto flex items-center gap-2">
            <span className="km-label text-km-steel-400">{t('quality')}</span>
            {(['low', 'med', 'high'] as const).map((option) => (
              <Control
                key={option}
                onClick={() => {
                  setTier(option);
                  setPinned(true);
                  setStep('full');
                }}
                pressed={pinned && tier === option}
                disabled={!showCanvas}
              >
                {t(`tier.${option}`)}
              </Control>
            ))}
          </div>
        </div>

        {/* The components, as a list. The 3D is illustration; this is the
            information, and it is here whether or not the canvas ever runs
            (Part 0.4 — every 3D scene has a DOM equivalent). */}
        {/*
         * The components, with the figures the catalogue prints for each.
         *
         * The 3D is illustration and this is the information — Part 0.4 is
         * explicit that every scene has a DOM equivalent, and this one is here
         * whether or not the canvas ever runs. Pointing at a row marks the part
         * on the machine; opening it shows what the catalogue states about it.
         */}
        {components.length && !fullscreen ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {components.map((component) => {
              const marked = activeComponent === component.object;
              const open = openComponent === component.id;
              return (
                <li
                  key={component.id}
                  data-component-card
                  data-component-object={component.object}
                  className={`border transition-colors duration-(--duration-km) ease-(--ease-km) ${
                    marked ? 'border-km-red' : 'border-km-steel-600/60'
                  }`}
                >
                  <button
                    type="button"
                    data-component={component.object}
                    aria-pressed={marked}
                    aria-expanded={open}
                    aria-controls={`component-panel-${component.id}`}
                    onClick={() => setOpenComponent(open ? null : component.id)}
                    onPointerEnter={() => setActiveComponent(component.object)}
                    onPointerLeave={() => setActiveComponent(null)}
                    onFocus={() => setActiveComponent(component.object)}
                    onBlur={() => setActiveComponent(null)}
                    className="km-label flex min-h-11 w-full items-center justify-between gap-3 px-3 text-start text-km-offwhite"
                  >
                    {component.title}
                    {component.specs.length ? (
                      <span aria-hidden="true" className="text-km-steel-400">
                        {open ? '−' : '+'}
                      </span>
                    ) : null}
                  </button>

                  {open && component.specs.length ? (
                    <dl
                      id={`component-panel-${component.id}`}
                      data-component-panel
                      className="border-t border-km-steel-600/60 p-3"
                    >
                      {component.specs.map((row) => (
                        <div key={row.label} className="flex justify-between gap-4 py-1">
                          <dt className="km-label text-km-steel-400">{tComponent.has(row.label) ? tComponent(row.label) : row.label}</dt>
                          <dd className="font-mono text-spec text-km-paper">{row.value}</dd>
                        </div>
                      ))}
                      {component.conceptual ? (
                        <p className="km-label mt-3 text-km-warning">{t('components.conceptual')}</p>
                      ) : null}
                    </dl>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </ScrollStateContext>
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
