import Image from 'next/image';
import { Link } from '@/i18n/navigation';

/**
 * The official CIS mark, used exactly as supplied — no redraw, no recolour
 * (CLAUDE.md, brand-tokens.css note 4).
 *
 * The supplied file is the full stacked mark with a transparent background, and
 * its 'KMC / KAOMING' wordmark is --km-ink (#2B2925). On --km-black that
 * wordmark is effectively invisible, so the mark sits on a --km-paper plaque —
 * one of the three backgrounds the brand note permits. Padding exceeds the
 * required clear space (the height of the KAOMING wordmark) at every size.
 *
 * ASSET REQUEST: a horizontal and a reversed (knockout) lockup would let the
 * mark read properly in a slim dark header. Until KAO MING supplies one,
 * the plaque is the only compliant option.
 */
export function Logo({ label }: { label: string }) {
  return (
    <Link
      href="/"
      aria-label={label}
      className="group -m-1 inline-flex shrink-0 items-center p-1"
    >
      <span className="block bg-km-paper p-1.5 transition-colors duration-(--duration-km) ease-(--ease-km) group-hover:bg-km-white sm:p-2">
        <Image
          src="/brand/KMC_CIS_Final_20240108_LOGO.png"
          alt=""
          width={3657}
          height={4091}
          loading="eager"
          sizes="64px"
          className="h-10 w-auto sm:h-13"
        />
      </span>
    </Link>
  );
}
