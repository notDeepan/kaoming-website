'use client';

import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

/**
 * The scene grade (Part C.1), locked to the recipe the spec specifies so every
 * machine on the site is graded identically: bloom at strength 0.45, radius 0.4,
 * threshold 0.82; vignette; grain at 0.05 and always the final pass.
 *
 * Both bloom and grain are switchable because they are the first two rungs of
 * the degradation ladder in Part O — the QualityManager turns them off before it
 * touches resolution, because grade is the cheapest thing to lose.
 */
export function PostFx({
  bloom,
  grain,
  light = false,
}: {
  bloom: boolean;
  grain: boolean;
  /** True on the light theme, where a heavy vignette reads as a dirty lens. */
  light?: boolean;
}) {
  // With everything switched off the composer is pure overhead; skip it.
  if (!bloom && !grain) return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {bloom ? (
        <Bloom intensity={0.45} radius={0.4} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
      ) : (
        <></>
      )}
      {/* The vignette's job is to sink the frame edge into the field. On black
          that wants 0.72; on paper the same figure paints a grey ring around a
          white room, so it drops to just enough to hold the corners. */}
      <Vignette
        offset={light ? 0.5 : 0.32}
        darkness={light ? 0.28 : 0.72}
        blendFunction={BlendFunction.NORMAL}
      />
      {grain ? <Noise premultiply opacity={0.05} blendFunction={BlendFunction.OVERLAY} /> : <></>}
    </EffectComposer>
  );
}
