'use client';

/**
 * The Part Q event taxonomy behind one typed function.
 *
 * Every event the spec names is declared here, so a call site cannot invent an
 * event name and dashboards cannot quietly drift from the taxonomy. Events that
 * belong to milestones not yet built are listed too — that is the contract those
 * milestones will implement, not dead code.
 *
 * With no measurement ID configured this is a no-op that logs in development,
 * which is also the shipping state: the redesign is not approved and must not be
 * sending anyone's browsing to an analytics property yet.
 */

export type AnalyticsEvent =
  | { name: 'product_viewed'; series: string; category: string }
  | { name: '3d_opened'; series: string }
  | { name: '3d_interacted'; series: string }
  | { name: 'exploded_started'; series: string }
  | { name: 'component_clicked'; series: string; component: string }
  | { name: 'xray_opened'; series: string }
  | { name: 'catalogue_opened'; doc_id: string }
  | { name: 'catalogue_page_viewed'; doc_id: string; page: number }
  | { name: 'catalogue_search'; query: string }
  | { name: 'pdf_downloaded'; doc_id: string }
  | { name: 'video_started'; video_id: string }
  | { name: 'video_completed'; video_id: string }
  | { name: 'application_viewed'; slug: string }
  | { name: 'compare_created'; machines: string[] }
  | { name: 'compare_machine_added'; series: string }
  | { name: 'search_performed'; query: string; results: number }
  | { name: 'rfq_started'; source: string }
  | { name: 'rfq_submitted'; machines: string[]; source: string }
  | { name: 'qr_entry'; model: string }
  | { name: 'language_switched'; to: string }
  | { name: 'distributor_viewed'; country: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const analyticsEnabled = Boolean(MEASUREMENT_ID);

export function track(event: AnalyticsEvent): void {
  const { name, ...params } = event;

  if (!analyticsEnabled) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[analytics]', name, params);
    }
    return;
  }

  window.gtag?.('event', name, params);
}
