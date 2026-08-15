import Script from 'next/script';

/**
 * GA4, loaded after hydration (Part O: "analytics deferred").
 *
 * Renders nothing at all without a measurement ID, which is the shipping state:
 * the redesign is not approved, so no visitor's browsing should be leaving for
 * an analytics property yet. The event layer in lib/analytics keeps working
 * either way — it logs in development and no-ops in production.
 */
export function AnalyticsScripts() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
gtag('js',new Date());
gtag('config','${measurementId}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
