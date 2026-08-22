'use client';

import Lenis from 'lenis';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { detectLowPower } from '@/lib/three/quality';
import { gsap, ScrollTrigger } from './gsap';

/**
 * Hard rule (Part 0.4): Lenis owns scroll, ScrollTrigger reads from Lenis, and
 * GSAP's ticker is the only RAF loop. Nothing else may call `requestAnimationFrame`
 * for scroll.
 *
 * Under `prefers-reduced-motion` Lenis is not instantiated at all — native
 * scrolling is the calm variant (Part P). Consumers keep working because
 * `useScrollSignal` falls back to a passive window listener.
 *
 * The same is true on a machine that cannot afford it. Smooth scroll is not
 * free: every frame it moves the document and re-runs ScrollTrigger against
 * every trigger on the page, and on a four-core office desktop that turns
 * scrolling into stuttering — which is the single most visible thing wrong with
 * this site on the machines its buyers actually use. `detectLowPower` drops
 * those visitors onto native scroll.
 *
 * Note what this deliberately does NOT do: it does not set `reducedMotion`.
 * Reduced motion is a stated preference and it unpins scenes, stops scrubs and
 * flattens the whole choreography site-wide. A slow computer is not a request
 * for the calm variant — it is a reason to stop paying for one luxury. The
 * visitor keeps every scene; the browser scrolls the page.
 */

export type ScrollSignal = {
  /** Pixels from the top of the document. */
  scroll: number;
  /** Signed velocity. Positive = scrolling down. Zero on the reduced-motion path. */
  velocity: number;
  /** 1 down, -1 up, 0 at rest. */
  direction: number;
};

type SmoothScrollContextValue = {
  /** The live instance, or null when smooth scroll is off. */
  lenisRef: { current: Lenis | null };
  reducedMotion: boolean;
  /**
   * True when Lenis is driving the page. False under reduced motion and on a
   * machine `detectLowPower` judged cannot afford it — two different reasons
   * for the same fallback, kept apart so callers can tell them apart.
   */
  smooth: boolean;
  subscribe: (listener: (signal: ScrollSignal) => void) => () => void;
  scrollTo: (target: string | number | HTMLElement, options?: { offset?: number }) => void;
  stop: () => void;
  start: () => void;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue | null>(null);

function usePrefersReducedMotion() {
  // Start false so the server and the first client paint agree; the effect
  // corrects it before any motion is scheduled.
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  // Starts false so the server and the first client paint agree, exactly as
  // `usePrefersReducedMotion` does; the effect corrects it before Lenis is
  // instantiated, because the instantiation is itself in an effect.
  const [lowPower, setLowPower] = useState(false);
  // Declared here, before the effect that reads it: the dependency array is
  // evaluated during render, so a `const` further down would be in its temporal
  // dead zone at that point.
  const smooth = !reducedMotion && !lowPower;
  const lenisRef = useRef<Lenis | null>(null);
  const listenersRef = useRef(new Set<(signal: ScrollSignal) => void>());

  const emit = useCallback((signal: ScrollSignal) => {
    for (const listener of listenersRef.current) listener(signal);
  }, []);

  useEffect(() => {
    setLowPower(detectLowPower());
  }, []);

  useEffect(() => {
    if (!smooth) return;

    const lenis = new Lenis({
      // Weighted, framerate-independent easing — prime directive 6, "lerp
      // everything". These are the values the whole site is tuned against.
      lerp: 0.09,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Touch devices keep native momentum; hijacking it feels broken on iOS.
      smoothWheel: true,
      // lenis 1.1.0 invokes this when it meets [data-lenis-prevent] and throws
      // if it was not supplied. The overlays depend on that attribute to scroll
      // themselves while the page behind them stays put.
      prevent: (node: Element) => node?.hasAttribute?.('data-lenis-prevent') ?? false,
    });
    // lenis 1.1.0 runs no RAF loop of its own — GSAP's ticker drives it below,
    // which is what keeps ScrollTrigger and every tween on one clock.
    lenisRef.current = lenis;

    const onScroll = () => {
      ScrollTrigger.update();
      emit({
        scroll: lenis.scroll,
        velocity: lenis.velocity,
        direction: lenis.direction ?? 0,
      });
    };
    lenis.on('scroll', onScroll);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);

    // Emit once so subscribers mounted before the first scroll get a baseline
    // (deep links and back-navigation restore mid-page).
    emit({ scroll: lenis.scroll, velocity: 0, direction: 0 });

    return () => {
      gsap.ticker.remove(tick);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [smooth, emit]);

  const subscribe = useCallback((listener: (signal: ScrollSignal) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const scrollTo = useCallback<SmoothScrollContextValue['scrollTo']>((target, options) => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset: options?.offset ?? 0 });
      return;
    }
    // Reduced-motion / pre-init path.
    const offset = options?.offset ?? 0;
    if (typeof target === 'number') {
      window.scrollTo({ top: target + offset });
      return;
    }
    const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (element) {
      window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY + offset });
    }
  }, []);

  const stop = useCallback(() => {
    const lenis = lenisRef.current;
    if (lenis) lenis.stop();
    else document.documentElement.classList.add('lenis-stopped');
  }, []);

  const start = useCallback(() => {
    const lenis = lenisRef.current;
    if (lenis) lenis.start();
    else document.documentElement.classList.remove('lenis-stopped');
  }, []);

  const value = useMemo<SmoothScrollContextValue>(
    () => ({ lenisRef, reducedMotion, smooth, subscribe, scrollTo, stop, start }),
    [reducedMotion, smooth, subscribe, scrollTo, stop, start],
  );

  return <SmoothScrollContext value={value}>{children}</SmoothScrollContext>;
}

export function useSmoothScroll() {
  const context = use(SmoothScrollContext);
  if (!context) {
    throw new Error('useSmoothScroll must be used inside <SmoothScrollProvider>');
  }
  return context;
}

/**
 * Subscribe to scroll without re-rendering. The handler is called from the
 * ticker, so it must only touch refs and the DOM — never setState per event.
 */
export function useScrollSignal(handler: (signal: ScrollSignal) => void) {
  const { subscribe, smooth } = useSmoothScroll();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const forward = (signal: ScrollSignal) => handlerRef.current(signal);

    // `smooth`, not `lenisRef.current`: child effects run before the provider's,
    // so on first mount the instance does not exist yet and reading the ref here
    // would strand every subscriber on the native listener for good. `smooth` is
    // state, so this re-runs the moment the answer changes.
    if (smooth) return subscribe(forward);

    // Native-scroll fallback: derive direction from the previous offset.
    let previous = window.scrollY;
    const onScroll = () => {
      const scroll = window.scrollY;
      const delta = scroll - previous;
      previous = scroll;
      forward({ scroll, velocity: delta, direction: Math.sign(delta) });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [subscribe, smooth]);
}
