import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

/**
 * Part D buttons. Three variants, no boolean modifiers:
 *  primary   — accent fill, inverts on hover
 *  secondary — hairline outline, fills on hover
 *  text      — mono label and arrow, rule draws in on hover
 *
 * Every variant carries a 44px minimum hit area and the shared 250ms weighted
 * easing. `Action` routes internally; `ActionLink` is for anything off-site or
 * a direct file (the catalogues), where next-intl's Link would be wrong.
 */

export type ActionVariant = 'primary' | 'secondary' | 'text' | 'onMedia';

const BASE =
  'km-label group inline-flex min-h-11 items-center justify-center gap-2.5 transition-colors duration-(--duration-km) ease-(--ease-km)';

const VARIANTS: Record<ActionVariant, string> = {
  primary:
    'border border-km-red bg-km-red px-5 py-3 text-km-on-brand hover:border-km-red-glow hover:bg-transparent hover:text-km-red-glow',
  secondary:
    'border border-km-steel-600 px-5 py-3 text-km-offwhite hover:border-km-offwhite hover:bg-km-offwhite hover:text-km-black',
  text: 'text-km-offwhite hover:text-km-red-glow',
  /*
   * Over a photograph. `secondary` fills with the body-text colour on hover and
   * letters itself in the page field, which over media is a white block with
   * white text in one theme and a black one in the other. This is the same
   * shape in the one colour that does not invert.
   */
  onMedia:
    'border border-km-on-brand/45 px-5 py-3 text-km-on-brand hover:border-km-on-brand hover:bg-km-on-brand hover:text-km-ink',
};

function Inner({ children, variant }: { children: ReactNode; variant: ActionVariant }) {
  return (
    <>
      <span className={variant === 'text' ? 'relative' : undefined}>
        {children}
        {variant === 'text' ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-current transition-transform duration-(--duration-km) ease-(--ease-km) group-hover:scale-x-100"
          />
        ) : null}
      </span>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3 shrink-0" fill="none">
        <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </>
  );
}

export function Action({
  href,
  variant = 'secondary',
  className = '',
  children,
}: {
  href: string;
  variant?: ActionVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      <Inner variant={variant}>{children}</Inner>
    </Link>
  );
}

export function ActionLink({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: ComponentProps<'a'> & { variant?: ActionVariant }) {
  return (
    <a {...props} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      <Inner variant={variant}>{children}</Inner>
    </a>
  );
}
