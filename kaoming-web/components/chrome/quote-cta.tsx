import { Link } from '@/i18n/navigation';
import { RFQ_HREF } from '@/lib/nav';

/**
 * The persistent accent CTA (Part E.2). Part D's full Button set is M1 work;
 * this is deliberately the chrome's own control so the design system can be
 * designed properly rather than reverse-engineered from a header button.
 */
export function QuoteCta({
  label,
  className = '',
  block = false,
}: {
  label: string;
  className?: string;
  block?: boolean;
}) {
  return (
    <Link
      href={`${RFQ_HREF}?source=header`}
      className={[
        'km-label inline-flex items-center justify-center gap-2 border border-km-red bg-km-red px-4 py-3 text-km-on-brand',
        'transition-colors duration-(--duration-km) ease-(--ease-km)',
        'hover:bg-transparent hover:text-km-red-glow hover:border-km-red-glow',
        block ? 'w-full' : 'min-h-11',
        className,
      ].join(' ')}
    >
      {label}
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none">
        <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </Link>
  );
}
