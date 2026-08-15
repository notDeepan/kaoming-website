import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // KAO MING HQ. Pinned so server and client agree on any rendered date and
    // no hydration mismatch appears once news/events land (Part J.7).
    timeZone: 'Asia/Taipei',
  };
});
