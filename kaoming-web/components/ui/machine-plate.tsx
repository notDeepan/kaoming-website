import Image from 'next/image';

/**
 * A machine on the dark field, lit from below.
 *
 * Every render the kit supplies is a studio plate on white; the knockout
 * derivative (scripts/prepare-images.mjs) removes that background so the machine
 * can stand in the hall rather than in a white box. The pool of light underneath
 * is CSS, not a baked shadow, so it stays consistent across every machine and
 * costs nothing to change.
 */

export type PlateImage = { src: string; width: number; height: number };

export function MachinePlate({
  image,
  alt,
  priority = false,
  sizes = '100vw',
  className = '',
  glow = 'md',
  transitionName,
}: {
  image: PlateImage;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  glow?: 'sm' | 'md' | 'lg';
  /**
   * Shared-element name for the card-to-page transition (Part G.0). The same
   * value on a product card and on that product's hero makes the browser tween
   * one into the other instead of cutting between two pages. Must be unique per
   * visible element, which is why it is the series slug.
   */
  transitionName?: string;
}) {
  const glowScale = { sm: 'inset-x-[12%] h-[16%]', md: 'inset-x-[6%] h-[22%]', lg: 'inset-x-0 h-[28%]' }[
    glow
  ];

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-[4%] ${glowScale} rounded-[50%] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-km-steel-400)_38%,transparent),transparent_70%)] blur-2xl`}
      />
      <Image
        src={image.src}
        alt={alt}
        width={image.width}
        height={image.height}
        sizes={sizes}
        priority={priority}
        className="relative h-auto w-full"
        style={transitionName ? { viewTransitionName: transitionName } : undefined}
      />
    </div>
  );
}

/**
 * The dimension rule — the site's signature annotation.
 *
 * Machine tools are sold on their travels, and the catalogues state them on
 * dimensioned elevations. So every machine on this site carries its principal
 * dimension drawn beneath it in the same language: a hairline between tick
 * terminators, the label in mono, the value in the data blue. The rule draws
 * itself in when its section reveals (see `[data-dim-rule]` in globals.css).
 *
 * The value is always a transcribed catalogue figure. Never a derived one.
 */
export function DimensionRule({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Off-white, not steel-400: the rule appears on cards over --km-steel-800,
          where steel-400 is 4.12:1 and misses AA (Part P). */}
      <span className="km-label shrink-0 text-km-offwhite">{label}</span>
      <span data-dim-rule className="km-dim relative h-px min-w-6 flex-1 bg-km-steel-600" />
      <span className="shrink-0 font-mono text-spec text-km-blue">{value}</span>
    </div>
  );
}
