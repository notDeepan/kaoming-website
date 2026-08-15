'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, type RefObject } from 'react';
import type { Group, Mesh, Object3D } from 'three';
import { Blockout } from './blockout';
import {
  BASIS_TRANSCODER_PATH,
  DRACO_DECODER_PATH,
  modelFor,
  type ModelTier,
} from '@/lib/three/models';

/**
 * Loads the machine, or shows the blockout when there is no machine to load.
 *
 * Decoders are self-hosted (Part C.1), so nothing here reaches a CDN at
 * runtime. When the artist's GLB lands it is registered in lib/three/models and
 * this component picks it up unchanged — the blockout branch simply stops being
 * taken.
 *
 * Both branches mount inside the same group, which is what the explode rig
 * reads. Neither branch is special-cased there: the blockout authors the same
 * H.2 userData the GLB will arrive with.
 */

useGLTF.setDecoderPath(DRACO_DECODER_PATH);

export function MachineModel({
  slug,
  tier,
  groupRef,
}: {
  slug: string;
  tier: ModelTier;
  /** The rig reads its parts from here (Part H.2). */
  groupRef?: RefObject<Group | null>;
}) {
  const entry = modelFor(slug);

  return (
    <group ref={groupRef} name="KM_machine">
      {entry ? <LoadedModel url={entry.files[tier]} /> : <Blockout />}
    </group>
  );
}

function LoadedModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, DRACO_DECODER_PATH, true, (loader) => {
    // KTX2 textures per H.3. `detectSupport` needs the renderer, which drei
    // wires for us; the transcoder path is ours.
    const ktx2 = (loader as unknown as { ktx2Loader?: { setTranscoderPath(path: string): void } })
      .ktx2Loader;
    ktx2?.setTranscoderPath(BASIS_TRANSCODER_PATH);
  });

  useEffect(() => {
    scene.traverse((child: Object3D) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Hotspots are DOM buttons, not 3D picks (Part G.6 asks for keyboard
      // order and a real panel), so nothing here needs to be raycast — and
      // keeping the machine out of the raycaster costs nothing to do.
      mesh.raycast = () => {};
    });
  }, [scene]);

  return <primitive object={scene} />;
}
