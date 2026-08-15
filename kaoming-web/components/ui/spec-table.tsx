import type { ReactNode } from 'react';

/**
 * Verified specification, presented as specification: mono figures, hairline
 * rules, no styling that could be mistaken for emphasis.
 *
 * Part 0.2 requires the UI to distinguish a verified specification from a
 * visual representation. Everything inside these two components is transcribed
 * from a 2026 catalogue; nothing else may be rendered here.
 */

export function SpecList({
  groups,
  labelFor,
  groupLabelFor,
}: {
  groups: { label: string; rows: { label: string; value: string }[] }[];
  labelFor: (key: string) => string;
  groupLabelFor: (key: string) => string;
}) {
  return (
    <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
      {groups.map((group) => (
        <section key={group.label} data-reveal>
          <h3 className="km-label border-b border-km-steel-600/60 pb-3 text-km-red-glow">
            {groupLabelFor(group.label)}
          </h3>
          <dl>
            {group.rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(9rem,40%)_1fr] gap-4 border-b border-km-steel-600/30 py-3"
              >
                <dt className="text-small text-km-steel-400">{labelFor(row.label)}</dt>
                <dd className="font-mono text-spec text-km-offwhite">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/**
 * The per-model table. Wide by nature — eighteen Neptunus models against six
 * columns — so it scrolls inside its own container and the model code stays
 * pinned to the left edge while the figures move.
 */
export function ModelTable({
  columns,
  rows,
  modelLabel,
  caption,
}: {
  columns: string[];
  rows: { model: string; cells: string[] }[];
  modelLabel: string;
  caption?: ReactNode;
}) {
  return (
    <figure className="mt-8">
      <div className="overflow-x-auto border border-km-steel-600/60">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-km-steel-600/60 bg-km-steel-800">
              <th
                scope="col"
                className="km-label sticky left-0 z-1 bg-km-steel-800 px-5 py-4 text-km-offwhite"
              >
                {modelLabel}
              </th>
              {columns.map((column) => (
                <th key={column} scope="col" className="km-label px-5 py-4 text-km-offwhite">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.model} className="border-b border-km-steel-600/30 last:border-b-0">
                <th
                  scope="row"
                  className="sticky left-0 z-1 bg-km-charcoal px-5 py-3.5 text-left font-display text-km-paper"
                >
                  {row.model}
                </th>
                {row.cells.map((cell, index) => (
                  <td
                    key={columns[index] ?? index}
                    className="px-5 py-3.5 font-mono text-spec text-km-offwhite whitespace-nowrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <figcaption className="mt-4 max-w-[70ch] text-small text-km-steel-400">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
