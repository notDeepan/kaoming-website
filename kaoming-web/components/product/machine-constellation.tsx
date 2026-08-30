'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * The machine, as a constellation.
 *
 * A series page used to open like every other product page on the internet: a
 * photograph, a name, two buttons, then a wall of specification below. This
 * replaces that opening with the thing a buyer actually arrives wanting — every
 * headline figure about the machine, at once, around the machine itself.
 *
 * **Why radial rather than a grid.** These figures are not a sequence and they
 * are not ranked; a buyer scanning for "how big is the table" should not have to
 * read past spindle speed to reach it. A ring gives ten facts the same standing
 * and puts the object they describe in the middle, which is what a specification
 * summary actually is. A grid would imply an order that the data does not have.
 *
 * **Below `lg` it is not radial.** A ring on a 390px screen is six overlapping
 * cards, so the same nodes become a single column and the connectors are not
 * drawn. The DOM order is the reading order either way — the ring is CSS
 * positioning over a list, never a re-ordering of it.
 *
 * **Motion.** Three things, all cheap: the connectors draw themselves once, the
 * nodes arrive staggered, and the whole field tilts a degree or two toward the
 * pointer. The tilt is a single transform on one parent, not per-node work.
 * Under `prefers-reduced-motion` none of it is created and the layout is simply
 * there (Part P).
 */

export type ConstellationNode = {
  id: string;
  label: string;
  value: string;
  /** Anchor of the specification group this fact belongs to, if it has one. */
  href: string | null;
};

export type ConstellationView = {
  src: string;
  width: number;
  height: number;
  /** The catalogue's own words for the angle, e.g. "front elevation". */
  view: string;
  model: string;
};

export function MachineConstellation({
  name,
  type,
  views,
  nodes,
  labels,
  onOpen3d,
  catalogueHref,
  transitionName,
}: {
  name: string;
  type: string;
  views: ConstellationView[];
  nodes: ConstellationNode[];
  labels: {
    view3d: string;
    catalogue: string;
    turntable: string;
    viewOf: string;
    hint: string;
    specifications: string;
  };
  /** Anchor of the 3D experience further down the page. */
  onOpen3d: string;
  catalogueHref: string | null;
  /** Shared-element name, matched by the product card that linked here. */
  transitionName?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useSmoothScroll();

  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  /*
   * The turntable.
   *
   * KAO MING supplies between one and six photographs per series, taken from
   * different angles rather than as an even sweep, so this is a cross-fade
   * through the angles that exist and not a synthesised rotation. It is what the
   * sketch asked for — a sprite of the machine turning — built only from
   * photographs the company actually took. A series with one photograph simply
   * holds still, which is the honest result and needs no special case.
   */
  useEffect(() => {
    if (reducedMotion || paused || views.length < 2) return;
    const id = window.setInterval(() => {
      setFrame((current) => (current + 1) % views.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [reducedMotion, paused, views.length]);

  /** Where each node sits on the ring, as a percentage of the field. */
  const placed = useMemo(() => ring(nodes.length), [nodes.length]);

  useGSAP(
    () => {
      if (reducedMotion) return;

      /*
       * The connectors draw from the centre outward, which is the direction the
       * eye should travel: object first, then what is claimed about it.
       *
       * Dash offset rather than GSAP's DrawSVG, which is a Club plugin this
       * project does not license. Two things this has to get right:
       *
       *  1. **The length is measured on screen, not in the viewBox.** The lines
       *     carry `vectorEffect="non-scaling-stroke"`, which reinterprets
       *     stroke-width, dash and offset in screen pixels — and the viewBox is
       *     0–100 stretched with `preserveAspectRatio="none"`, so `getTotalLength`
       *     returns about 40 for a line that is 500px long. The dash would repeat
       *     a dozen times instead of drawing once.
       *
       *  2. **The starting state is written before the timeline is built.** It
       *     was a `.add()` callback inside the timeline with the tween positioned
       *     at `-=0.35`, which put the tween *earlier* than the callback that set
       *     the dash — so the tween captured an offset of zero, the callback then
       *     set it to the full length, and the lines stayed invisible.
       */
      for (const line of gsap.utils.toArray<SVGLineElement>('[data-connector]')) {
        const box = line.getBoundingClientRect();
        const length = Math.hypot(box.width, box.height) || 1;
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
      }

      const timeline = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top 72%', once: true },
      });

      timeline
        .from('[data-constellation-core]', {
          opacity: 0,
          scale: 0.94,
          duration: 0.7,
          ease: 'power3.out',
        })
        .to(
          '[data-connector]',
          { strokeDashoffset: 0, duration: 0.7, stagger: 0.05, ease: 'power2.out' },
          '-=0.35',
        )
        .from(
          '[data-node]',
          { opacity: 0, scale: 0.9, y: 14, duration: 0.55, stagger: 0.05, ease: 'power3.out' },
          '-=0.3',
        );

      // The tilt. One transform on the field, driven by the pointer, damped so
      // it settles rather than tracking exactly — the difference between depth
      // and a wobble.
      const element = field.current;
      if (!element || window.matchMedia('(pointer: coarse)').matches) return;

      const rotateX = gsap.quickTo(element, 'rotationX', { duration: 0.7, ease: 'power3.out' });
      const rotateY = gsap.quickTo(element, 'rotationY', { duration: 0.7, ease: 'power3.out' });

      const onMove = (event: PointerEvent) => {
        const box = element.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        rotateX(-y * 4);
        rotateY(x * 4);
      };
      const onLeave = () => {
        rotateX(0);
        rotateY(0);
      };

      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);

      return () => {
        element.removeEventListener('pointermove', onMove);
        element.removeEventListener('pointerleave', onLeave);
        timeline.scrollTrigger?.kill();
        timeline.kill();
        ScrollTrigger.refresh();
      };
    },
    { scope: root, dependencies: [reducedMotion, nodes.length], revertOnUpdate: true },
  );

  return (
    <section
      ref={root}
      data-constellation
      aria-label={`${name} — ${labels.specifications}`}
      className="relative overflow-hidden border-b border-km-steel-600/60 bg-km-charcoal"
    >
      {/* The sheet under it. A drawing grid, at the threshold of visible —
          it is what makes the field read as a surface the nodes sit on rather
          than as empty page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:linear-gradient(var(--color-km-steel-600)_1px,transparent_1px),linear-gradient(90deg,var(--color-km-steel-600)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-[1600px] px-5 pt-10 pb-16 sm:px-6 lg:pt-40 xl:px-10">
        {/* ------------------------------------------------------ the field */}
        <div
          ref={field}
          data-constellation-field
          className="relative [perspective:1400px] [transform-style:preserve-3d] lg:aspect-[7/6] xl:aspect-[16/11]"
        >
          {/* Connectors, under everything. Absent below `lg`, where there is no
              ring for them to connect. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-1 hidden size-full lg:block"
          >
            {placed.map((point, index) => {
              const node = nodes[index];
              if (!node) return null;
              const lit = active === node.id;
              return (
                <line
                  key={node.id}
                  data-connector
                  x1="50"
                  y1="50"
                  x2={point.x}
                  y2={point.y}
                  stroke={lit ? 'var(--color-km-red)' : 'var(--color-km-blue)'}
                  strokeOpacity={lit ? 0.9 : 0.32}
                  /* In screen pixels, not user units: `non-scaling-stroke`
                     reinterprets `stroke-width` against the viewport rather than
                     the 0–100 viewBox, so the 0.18 that reads as a hairline in
                     viewBox units renders as a fifth of a pixel and disappears
                     entirely. */
                  strokeWidth={lit ? 2 : 1}
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-(--duration-km) ease-(--ease-km)"
                />
              );
            })}
          </svg>

          {/* --------------------------------------------------- the core */}
          <div
            data-constellation-core
            className="relative z-3 mx-auto w-full max-w-sm lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2"
            style={{ transform: 'translateZ(60px)' }}
          >
            <div className="border border-km-steel-600 bg-km-steel-800 p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)]">
              <div
                className="relative aspect-4/3 overflow-hidden bg-km-black"
                onPointerEnter={() => setPaused(true)}
                onPointerLeave={() => setPaused(false)}
              >
                {views.map((view, index) => (
                  <Image
                    key={view.src}
                    src={view.src}
                    alt={labels.viewOf.replace('{view}', view.view).replace('{model}', view.model)}
                    fill
                    priority={index === 0}
                    sizes="(min-width: 1024px) 28rem, 92vw"
                    /* The shared element for the card-to-page transition
                       (Part G.0). Only the first frame carries it: the name has
                       to be unique in the document, and it is the frame that is
                       on screen when the page arrives. */
                    style={index === 0 && transitionName ? { viewTransitionName: transitionName } : undefined}
                    className={`object-contain p-3 transition-opacity duration-700 ease-(--ease-km) ${
                      index === frame ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}

                {views.length > 1 ? (
                  <span className="km-label absolute end-3 bottom-3 border border-km-steel-600 bg-km-black/80 px-2 py-1 text-km-blue">
                    360°
                  </span>
                ) : null}
              </div>

              {/* Which angle is showing. A caption, not a control: the frames
                  advance on their own and stop while a pointer is over them. */}
              {views.length > 1 ? (
                <ol className="mt-3 flex items-center gap-1.5" aria-label={labels.turntable}>
                  {views.map((view, index) => (
                    <li key={view.src} className="contents">
                      <button
                        type="button"
                        data-frame={index}
                        aria-current={index === frame}
                        aria-label={view.view}
                        onClick={() => setFrame(index)}
                        className={`h-0.5 flex-1 transition-colors duration-(--duration-km) ${
                          index === frame ? 'bg-km-red' : 'bg-km-steel-600 hover:bg-km-steel-400'
                        }`}
                      />
                    </li>
                  ))}
                </ol>
              ) : null}

              <h1 className="mt-5 font-display text-h3 text-balance text-km-paper">{name}</h1>
              <p className="mt-1 text-small text-km-steel-400">{type}</p>

              <div className="mt-5 flex flex-col gap-2">
                <a
                  href={onOpen3d}
                  className="km-label flex min-h-11 items-center justify-center border border-km-red bg-km-red px-4 text-km-on-brand transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-red-glow hover:bg-transparent hover:text-km-red-glow"
                >
                  {labels.view3d}
                </a>
                {catalogueHref ? (
                  <a
                    href={catalogueHref}
                    target="_blank"
                    rel="noopener"
                    className="km-label flex min-h-11 items-center justify-center border border-km-steel-600 px-4 text-km-offwhite transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-offwhite"
                  >
                    {labels.catalogue}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- the nodes */}
          <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-0 lg:block">
            {nodes.map((node, index) => {
              const point = placed[index];
              return (
                <div
                  key={node.id}
                  data-node
                  data-fact={node.id}
                  onPointerEnter={() => setActive(node.id)}
                  onPointerLeave={() => setActive(null)}
                  className="lg:absolute lg:z-2 lg:w-[13.5rem] lg:-translate-x-1/2 lg:-translate-y-1/2 xl:w-[15.5rem]"
                  style={
                    point
                      ? ({
                          '--x': `${point.x}%`,
                          '--y': `${point.y}%`,
                          left: 'var(--x)',
                          top: 'var(--y)',
                          transform: 'translateZ(24px)',
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <NodeCard node={node} active={active === node.id} onFocus={setActive} />
                </div>
              );
            })}
          </dl>
        </div>

        <p className="km-label mt-12 text-center text-km-steel-400 lg:mt-8">{labels.hint}</p>
      </div>
    </section>
  );
}

function NodeCard({
  node,
  active,
  onFocus,
}: {
  node: ConstellationNode;
  active: boolean;
  onFocus: (id: string | null) => void;
}) {
  const body = (
    <>
      <dt className="km-label text-km-red-glow">{node.label}</dt>
      {/* Three lines at most. A node is a headline figure, and an architecture
          note that runs to six lines stops the ring being a ring — the full text
          is in the specification table the card links to. */}
      <dd className="mt-2 line-clamp-3 font-mono text-small leading-snug text-km-paper sm:text-body">
        {node.value}
      </dd>
    </>
  );

  const shell = `block h-full border bg-km-steel-800 p-4 transition-colors duration-(--duration-km) ease-(--ease-km) ${
    active ? 'border-km-red' : 'border-km-steel-600/60'
  }`;

  // A fact that belongs to a specification group is a link to that group; one
  // that does not is a plain card. Nothing pretends to be clickable.
  return node.href ? (
    <a
      href={node.href}
      onFocus={() => onFocus(node.id)}
      onBlur={() => onFocus(null)}
      className={`${shell} hover:border-km-red`}
    >
      {body}
    </a>
  ) : (
    <div className={shell}>{body}</div>
  );
}

/**
 * Where the nodes sit, in percentages of the field.
 *
 * An ellipse rather than a circle, because the field is wider than it is tall
 * and a circle in a wide box leaves the sides empty while crowding the top.
 *
 * **The half-step offset is the whole trick.** With an even count and no offset,
 * one node lands exactly at twelve o'clock and another at six — directly over
 * and under the core, which is the tallest thing on the field, and they collide
 * with it. Rotating the whole ring by half a step puts a *pair* either side of
 * the vertical axis instead, and the core's column is clear. It costs nothing
 * and it is why the radii can stay generous.
 *
 * The vertical radius is the smaller of the two because a node is wider than it
 * is tall: pushing them out sideways buys clearance from the core, pushing them
 * down only buys clearance from each other.
 */
function ring(count: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const step = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, index) => {
    const angle = index * step - Math.PI / 2 + step / 2;
    return {
      x: 50 + Math.cos(angle) * 41,
      y: 50 + Math.sin(angle) * 39,
    };
  });
}
