'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * Box way or linear way — a real buyer decision, built as a decision tool.
 *
 * Part E.1 asks for this explicitly: "a genuine buyer decision tool — build it
 * as an interactive comparison, not prose". A buyer choosing a machine tool is
 * choosing between sliding friction and rolling friction, and KAO MING has
 * written down what each is good at. Two columns side by side on a wide screen
 * so the trade-off is legible at a glance; a tabbed pair on a phone, because two
 * columns of technical points at 390px is neither.
 *
 * Every line is verbatim from `company.json`. Nothing is summarised, and no
 * recommendation is made — the machine that suits a buyer's work is a
 * conversation with sales, and the enquiry is one section below.
 */

type Way = { title: string; points: string[] };

export function WaySelector({ box, linear }: { box: Way; linear: Way }) {
  const t = useTranslations('Technology');
  const [shown, setShown] = useState<'box' | 'linear'>('box');

  return (
    <div>
      {/* Phone: one at a time. The tabs are hidden from wide screens, where both
          columns are visible and a tab would be a control that does nothing. */}
      <div role="tablist" aria-label={t('ways.title')} className="flex gap-px md:hidden">
        {(
          [
            ['box', box.title],
            ['linear', linear.title],
          ] as const
        ).map(([key, title]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`way-tab-${key}`}
            aria-selected={shown === key}
            aria-controls={`way-panel-${key}`}
            onClick={() => setShown(key)}
            className={`km-label min-h-11 flex-1 border px-4 py-3 transition-colors duration-(--duration-km) ease-(--ease-km) ${
              shown === key
                ? 'border-km-red bg-km-red text-km-on-brand'
                : 'border-km-steel-600 text-km-offwhite'
            }`}
          >
            {title}
          </button>
        ))}
      </div>

      {/* The one place on the site where two equal columns are correct.
          Everything else is deliberately asymmetric, because an even split
          implies two things carry the same weight — and here they do. Box way
          and linear way are alternatives, not a recommendation; giving one more
          width would make a choice KAO MING has not made for the buyer. */}
      <div className="mt-6 grid gap-px md:mt-0 md:grid-cols-2">
        {(
          [
            ['box', box],
            ['linear', linear],
          ] as const
        ).map(([key, way]) => (
          <section
            key={key}
            id={`way-panel-${key}`}
            role="tabpanel"
            aria-labelledby={`way-tab-${key}`}
            data-way={key}
            // Hidden on a phone unless selected; always shown from md up, where
            // the point of the section is the comparison itself.
            className={`border border-km-steel-600/60 p-6 sm:p-8 ${
              shown === key ? '' : 'hidden'
            } md:block`}
          >
            <h3 className="font-display text-h3 text-km-paper">{way.title}</h3>
            <ul className="mt-6 flex flex-col gap-4">
              {way.points.map((point) => {
                const [lead, ...rest] = point.split(':');
                const labelled = rest.length > 0;
                return (
                  <li key={point} className="border-t border-km-steel-600/30 pt-4">
                    {labelled ? (
                      <>
                        <span className="km-label text-km-red-glow">{lead}</span>
                        <span className="mt-1 block text-body text-km-offwhite">
                          {rest.join(':').trim()}
                        </span>
                      </>
                    ) : (
                      <span className="text-body text-km-offwhite">{point}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
