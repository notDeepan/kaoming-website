'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, type RefObject } from 'react';
import { track } from '@/lib/analytics';
import type { MachineComponent } from '@/lib/machines';
import type { SceneScroll } from '@/lib/three/scroll-state';

/**
 * Scenes 04 → 06 in the DOM (Part G.4, G.5, G.6, G.8).
 *
 * The 3D is illustration here, never the carrier: every component's name and
 * every figure the catalogue states about it is ordinary, selectable, indexable
 * DOM, reachable with Tab and readable with the canvas switched off entirely.
 * What the exploded machine adds is *where* the component is — and that is
 * exactly what the leader line draws.
 */

export function ComponentScenes({
  components,
  active,
  open,
  onActive,
  onOpen,
  series,
  reducedMotion,
}: {
  components: MachineComponent[];
  /** The component being pointed at — hover or focus, whichever came last. */
  active: string | null;
  /** The component whose panel is open. */
  open: string | null;
  onActive: (id: string | null) => void;
  onOpen: (id: string | null) => void;
  series: string;
  reducedMotion: boolean;
}) {
  const t = useTranslations('Viewer');

  return (
    <div data-explode>
      {/* ---------------------------------------------------------- Scene 04 */}
      <section
        data-explode-scene="04"
        className="flex min-h-svh items-end px-6 pb-24 md:px-12"
      >
        <div data-feature-panel className="max-w-prose">
          <p className="km-label text-km-red-glow">{t('scene04.label')}</p>
          <h2 className="km-display mt-3 text-balance text-display-sm text-km-offwhite">
            {t('scene04.title')}
          </h2>
          <p className="mt-4 text-body text-km-steel-400">{t('scene04.copy')}</p>
        </div>
      </section>

      {/* ---------------------------------------------------------- Scene 05 */}
      <section data-explode-scene="05" className="min-h-[180svh] px-6 md:px-12">
        <div className="sticky top-24 max-w-xl pb-24">
          <p className="km-label text-km-red-glow">{t('scene05.label')}</p>
          <h2 className="km-display mt-3 text-display-xs text-km-offwhite">
            {t('scene05.title')}
          </h2>
          <p className="mt-3 max-w-prose text-body text-km-steel-400">{t('scene05.copy')}</p>

          <ul className="mt-8 flex flex-col gap-px border-y border-km-steel-600/60">
            {components.map((component) => (
              <ComponentRow
                key={component.id}
                component={component}
                expanded={open === component.id}
                onActive={onActive}
                onToggle={() => {
                  const next = open === component.id ? null : component.id;
                  onOpen(next);
                  if (next) track({ name: 'component_clicked', series, component: component.id });
                }}
              />
            ))}
          </ul>

          {!reducedMotion ? (
            <p className="km-label mt-4 text-km-steel-400">{t('scene05.hint')}</p>
          ) : null}
        </div>
      </section>

      {/* ---------------------------------------------------------- Scene 06 */}
      <section
        data-explode-scene="06"
        className="flex min-h-svh items-center justify-center px-6 text-center"
      >
        <div data-feature-panel>
          <h2 className="km-display text-balance text-display-sm text-km-offwhite">
            {t('scene06.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-prose text-body text-km-steel-400">
            {t('scene06.copy')}
          </p>
        </div>
      </section>

      {/* `active` is what the canvas highlights; keeping it in the markup means
          a test — and a screen reader user's focus — can see the same state. */}
      <span hidden data-active-component={active ?? ''} />
    </div>
  );
}

/**
 * One component. A button, not a div with a click handler: Part G.6 asks for
 * hotspots that are focusable in DOM order and open a panel on Enter, and a
 * button is the only element that gets all of that without being rebuilt.
 */
function ComponentRow({
  component,
  expanded,
  onActive,
  onToggle,
}: {
  component: MachineComponent;
  expanded: boolean;
  onActive: (id: string | null) => void;
  onToggle: () => void;
}) {
  const t = useTranslations('Viewer');
  const spec = useTranslations('Component.spec');
  const panelId = `component-panel-${component.id}`;

  return (
    <li className="border-y border-km-steel-600/40">
      <button
        type="button"
        data-component-card={component.id}
        data-component-object={component.object}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        onMouseEnter={() => onActive(component.id)}
        onMouseLeave={() => onActive(null)}
        onFocus={() => onActive(component.id)}
        onBlur={() => onActive(null)}
        className="flex min-h-14 w-full items-center gap-4 py-3 text-start transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-blue focus-visible:text-km-blue"
      >
        <span
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full transition-colors duration-(--duration-km) ${
            expanded ? 'bg-km-blue' : 'bg-km-steel-600'
          }`}
        />
        <span className="km-display flex-1 text-body text-km-offwhite">{component.title}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          className={`size-3 shrink-0 text-km-steel-400 transition-transform duration-(--duration-km) ease-(--ease-km) ${
            expanded ? 'rotate-90' : ''
          }`}
        >
          <path d="M5 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <div id={panelId} hidden={!expanded} className="pb-6 ps-6">
        <dl className="flex flex-col gap-2">
          {component.specs.map((row) => (
            <div key={row.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <dt className="km-label min-w-40 text-km-steel-400">
                {spec.has(row.label) ? spec(row.label) : row.label}
              </dt>
              <dd className="font-mono text-spec text-km-offwhite">{row.value}</dd>
            </div>
          ))}
        </dl>

        {component.conceptual ? (
          <p className="km-label mt-3 text-km-warning">{t('components.conceptual')}</p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The leader line (Part G.5): a hairline from the component's row in the list to
 * where that part actually is in the exploded machine.
 *
 * It reads the projection the canvas publishes and writes SVG attributes
 * directly — no React state, so pointing at a component costs one rAF loop and
 * no re-render. The loop only runs while something is being pointed at.
 */
export function LeaderLine({
  scroll,
  active,
  components,
  stage,
}: {
  scroll: RefObject<SceneScroll>;
  active: string | null;
  components: MachineComponent[];
  stage: RefObject<HTMLDivElement | null>;
}) {
  const line = useRef<SVGLineElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const component = components.find((entry) => entry.id === active);
    const root = svg.current;
    if (!component || !root) return;

    let frame = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);

      const projection = scroll.current.projections[component.object];
      const stageBox = stage.current?.getBoundingClientRect();
      const card = document.querySelector(`[data-component-card="${component.id}"]`);
      if (!projection || !projection.visible || !stageBox || !card) {
        root.style.opacity = '0';
        return;
      }

      const cardBox = card.getBoundingClientRect();
      const x2 = projection.x * stageBox.width;
      const y2 = projection.y * stageBox.height;
      // Leave from the row's trailing edge, vertically centred on it.
      const x1 = cardBox.right - stageBox.left;
      const y1 = cardBox.top + cardBox.height / 2 - stageBox.top;

      // A line to somewhere off the stage is worse than no line at all.
      const outside = x2 < 0 || y2 < 0 || x2 > stageBox.width || y2 > stageBox.height;
      root.style.opacity = outside ? '0' : '1';
      if (outside) return;

      line.current?.setAttribute('x1', String(x1));
      line.current?.setAttribute('y1', String(y1));
      line.current?.setAttribute('x2', String(x2));
      line.current?.setAttribute('y2', String(y2));
      ring.current?.setAttribute('cx', String(x2));
      ring.current?.setAttribute('cy', String(y2));
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      root.style.opacity = '0';
    };
  }, [active, components, scroll, stage]);

  return (
    <svg
      ref={svg}
      data-leader-line
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-2 size-full opacity-0 transition-opacity duration-(--duration-km)"
    >
      <line
        ref={line}
        stroke="var(--color-km-blue)"
        strokeWidth="1"
        strokeDasharray="2 4"
        vectorEffect="non-scaling-stroke"
      />
      <circle ref={ring} r="5" fill="none" stroke="var(--color-km-blue)" strokeWidth="1" />
    </svg>
  );
}
