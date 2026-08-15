import type { ReactNode } from 'react';

/**
 * The site-wide section opener (Part B.3): index, label, title.
 *
 * The index is optional and only passed where the sections genuinely form the
 * buyer's sequence from Part A.2 — discover, explore, understand, convert.
 * Numbering a set of unordered tiles would be decoration pretending to be
 * structure.
 */
export function SectionHeader({
  index,
  label,
  title,
  lede,
  action,
  className = '',
}: {
  index?: string;
  label?: string;
  title: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${className}`}>
      <div className="max-w-[46ch]">
        {index || label ? (
          <p className="km-label mb-5 flex items-center gap-3 text-km-steel-400">
            {index ? <span className="text-km-red-glow">{index}</span> : null}
            {index && label ? <span aria-hidden="true" className="h-px w-6 bg-km-steel-600" /> : null}
            {label ? <span>{label}</span> : null}
          </p>
        ) : null}
        <h2 className="text-h2 text-km-paper uppercase">{title}</h2>
        {lede ? <p className="mt-5 text-km-steel-400">{lede}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
