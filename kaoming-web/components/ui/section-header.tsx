import type { ReactNode } from 'react';
import { MarginIndex } from './layout';

/**
 * The section opener, composed as a drawing's title block.
 *
 * It used to be a centred stack — eyebrow, then h2, then lede, then an action
 * pushed to the right — repeated identically at the top of every section on the
 * site. Same width, same rhythm, same distance to the content below. That
 * sameness is what made the page read as generated.
 *
 * Now the index is a balloon numeral hung out in the margin at 5–11rem, the
 * label sits *beside* it on a hairline that runs off the viewport, and the title
 * is allowed to be wider than the copy under it. The lede is deliberately narrow
 * against a wide title, so the two are never the same measure.
 *
 * The index is still only passed where the sections genuinely form the buyer's
 * sequence from Part A.2. Numbering unordered tiles would be decoration
 * pretending to be structure.
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
    <div className={`relative ${index ? 'pt-10 sm:pt-14' : ''} ${className}`}>
      {index ? <MarginIndex index={index} /> : null}

      <div className="relative flex flex-col gap-x-16 gap-y-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[24ch]">
          {label ? (
            <p className="km-label mb-6 flex items-center gap-4 text-km-steel-400">
              {/* The leader. Runs from the label out past the edge of the
                  container, the way a dimension line does not stop at the
                  object it measures. */}
              <span aria-hidden="true" className="h-px w-10 shrink-0 bg-km-red sm:w-16" />
              <span>{label}</span>
            </p>
          ) : null}
          <h2 className="text-h2 text-balance text-km-paper uppercase">{title}</h2>
        </div>

        {/* The lede is a margin note, not a subtitle: narrow, set low, and never
            the same width as the title above it. */}
        {lede ? (
          <p className="max-w-[38ch] text-body text-km-steel-400 lg:pb-2">{lede}</p>
        ) : null}

        {action ? <div className="shrink-0 lg:pb-1">{action}</div> : null}
      </div>
    </div>
  );
}
