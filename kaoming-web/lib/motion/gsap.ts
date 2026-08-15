'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Single registration point for GSAP. Importing plugins in more than one module
 * is how double-registration and duplicated ScrollTrigger instances start.
 *
 * `lagSmoothing(0)` is required: with Lenis driving the ticker, GSAP's default
 * lag recovery makes scrubbed timelines jump after a stall instead of staying
 * locked to scroll position (Part O — "framerate-independent, delta-driven").
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
  gsap.ticker.lagSmoothing(0);
}

export { gsap, ScrollTrigger, useGSAP };
