import type { ReactNode } from 'react';
import { socialLinks } from '@/lib/company';

/**
 * The three accounts KAO MING links from its own footer.
 *
 * Nothing is added and nothing is guessed: an account this company does not run
 * is not a social link, it is a claim. The list comes from
 * `content/company/company.json`, in the order kaoming.com lists them, and a
 * fourth platform appears here the day it appears there.
 *
 * The Instagram entry is a bit.ly short link. It is KAO MING's own, it is what
 * their site links, and rewriting it to a guessed profile URL would be inventing
 * a destination — so it is passed through as supplied.
 *
 * `rel="me"` is the one piece of markup that makes these more than decoration:
 * it is the standard declaration that the linked profile is the same entity as
 * the linking site, which is what a verifier or a rich-result crawler reads.
 */

const GLYPHS: Record<string, ReactNode> = {
  facebook: (
    <path
      d="M13.5 9.2h-2v6.9H8.9V9.2H7.5V7h1.4V5.6C8.9 4.2 9.6 2.9 11.8 2.9l2 .01v2.16h-1.45c-.33 0-.8.16-.8.88V7h2.25l-.3 2.2Z"
      fill="currentColor"
    />
  ),
  // Outline plus a filled play triangle rather than a solid badge with a
  // knocked-out triangle: the knockout would have to be painted in whatever
  // surface the mark happens to sit on, and it sits on three different ones.
  youtube: (
    <>
      <rect
        x="2.4"
        y="5"
        width="15.2"
        height="10"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <path d="M8.6 7.7 13.1 10l-4.5 2.3V7.7Z" fill="currentColor" />
    </>
  ),
  instagram: (
    <>
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <circle cx="14.1" cy="5.9" r="1" fill="currentColor" />
    </>
  ),
};

export function SocialLinks({
  heading,
  className = '',
}: {
  /** Rendered as the list's accessible name. */
  heading: string;
  className?: string;
}) {
  if (!socialLinks.length) return null;

  return (
    <nav aria-label={heading} className={className}>
      <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {socialLinks.map((link) => (
          <li key={link.id}>
            <a
              href={link.href}
              target="_blank"
              rel="me noopener noreferrer"
              data-social={link.id}
              className="km-label flex min-h-11 items-center gap-2 px-2 text-km-steel-400 transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-offwhite"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4.5 shrink-0">
                {GLYPHS[link.id] ?? <circle cx="10" cy="10" r="7" fill="currentColor" />}
              </svg>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
