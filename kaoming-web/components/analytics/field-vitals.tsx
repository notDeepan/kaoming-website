'use client';

import { useEffect } from 'react';

/**
 * The Part O field beacon: LCP, INP and CLS from real visitors.
 *
 * Part O sets its budgets at the **75th percentile in the field**, and a
 * Lighthouse score is a lab number on one machine. The product template's CLS
 * has been sitting at 0.148 in Lighthouse and 0.000 in a real browser at the
 * same viewport since M1 — this is what settles that: whether anybody actually
 * experiences the shift.
 *
 * Written against `PerformanceObserver` directly rather than pulling in the
 * `web-vitals` package. Three metrics, forty lines, and no third-party script on
 * a page whose whole point is that its script budget is defended. The
 * calculations follow the same definitions the library uses:
 *
 *  * **LCP** — the last `largest-contentful-paint` entry before the first
 *    interaction or the page being hidden, which is when the metric freezes.
 *  * **CLS** — the largest *session window* of layout shifts, where a window
 *    ends after a 1s gap or 5s of total duration. A naive sum over-reports on
 *    long pages, and every page here is long.
 *  * **INP** — the worst interaction latency observed, from `event` entries with
 *    a duration. Approximate at low interaction counts, which is what the field
 *    is for: one visit is a sample, not a measurement.
 *
 * Nothing is sent while no measurement ID is configured — which is the shipping
 * state, because the redesign is not approved and must not be reporting
 * anyone's browsing yet. In development the numbers go to the console, where
 * they are useful to whoever is looking at the page.
 */

type Metric = { name: 'LCP' | 'INP' | 'CLS'; value: number; rating: 'good' | 'poor' };

/** Part O's own limits, so the beacon reports against the budget it defends. */
const LIMITS = { LCP: 2500, INP: 200, CLS: 0.1 } as const;

export function FieldVitals() {
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    const report = (name: Metric['name'], value: number) => {
      const rounded = name === 'CLS' ? Number(value.toFixed(4)) : Math.round(value);
      const metric: Metric = {
        name,
        value: rounded,
        rating: rounded <= LIMITS[name] ? 'good' : 'poor',
      };

      if (window.gtag) {
        window.gtag('event', 'web_vitals', {
          metric_name: metric.name,
          metric_value: metric.value,
          metric_rating: metric.rating,
          page_path: window.location.pathname,
        });
      } else if (process.env.NODE_ENV === 'development') {
        console.info(`[vitals] ${metric.name} ${metric.value} (${metric.rating})`);
      }
    };

    /**
     * Each observer is kept with the handler that reads its entries, because
     * both have to run at flush time.
     *
     * `takeRecords()` returns the entries the observer has queued but not yet
     * delivered, **and clears the queue without invoking the callback**. Calling
     * it and discarding the result — which is the obvious-looking way to write
     * this — therefore throws away exactly the records it exists to rescue: the
     * ones from the end of the visit, after the last callback and before the
     * page went away. Those are the shifts a visitor saw last and the slowest
     * interaction they had, so losing them biases every metric optimistic.
     */
    const drains: (() => void)[] = [];
    const observers: PerformanceObserver[] = [];

    const observe = (type: string, handle: (entries: PerformanceEntryList) => void) => {
      try {
        const observer = new PerformanceObserver((list) => handle(list.getEntries()));
        observer.observe({ type, buffered: true } as PerformanceObserverInit);
        observers.push(observer);
        drains.push(() => handle(observer.takeRecords()));
      } catch {
        // An unsupported entry type is not an error worth showing anyone.
      }
    };

    // --- LCP: the last candidate before the metric freezes.
    let lcp = 0;
    observe('largest-contentful-paint', (entries) => {
      lcp = entries[entries.length - 1]?.startTime ?? lcp;
    });

    // --- CLS: largest session window, not the naive sum.
    let cls = 0;
    let windowValue = 0;
    let windowStart = 0;
    let windowPrevious = 0;
    observe('layout-shift', (entries) => {
      for (const entry of entries as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (entry.hadRecentInput) continue;

        const gap = entry.startTime - windowPrevious;
        const span = entry.startTime - windowStart;
        if (windowValue && (gap > 1000 || span > 5000)) {
          cls = Math.max(cls, windowValue);
          windowValue = 0;
          windowStart = entry.startTime;
        }
        if (!windowValue) windowStart = entry.startTime;

        windowValue += entry.value;
        windowPrevious = entry.startTime;
      }
      cls = Math.max(cls, windowValue);
    });

    // --- INP: the worst interaction the visit contained.
    let inp = 0;
    observe('event', (entries) => {
      for (const entry of entries as (PerformanceEntry & { duration: number })[]) {
        if (entry.duration > inp) inp = entry.duration;
      }
    });

    /**
     * Reported when the page is hidden, not on unload: `pagehide` and
     * `visibilitychange` are the only events a mobile browser reliably fires
     * before it discards the page, and `unload` is not one of them.
     */
    let sent = false;
    const flush = () => {
      if (sent || document.visibilityState !== 'hidden') return;
      sent = true;
      // Drain what each observer queued after its last callback, through the
      // same handler, so those entries actually count.
      for (const drain of drains) drain();
      if (lcp) report('LCP', lcp);
      if (inp) report('INP', inp);
      report('CLS', cls);
    };

    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);

    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  return null;
}
