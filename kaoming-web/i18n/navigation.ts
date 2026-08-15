import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware navigation. Always import `Link`, `useRouter`, `usePathname`
 * and `redirect` from here rather than from `next/link` / `next/navigation`,
 * or links will drop the locale prefix.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
