'use client';

import { Environment, Lightformer } from '@react-three/drei';

/**
 * The machine hall (Part B.1 #1): vast, dark, silent, precisely lit.
 *
 * Cinematic three-point key plus an environment built out of Lightformers
 * rather than an HDRI file. That is not a shortcut — it is the only way to
 * satisfy two rules at once. Part 0.4 forbids `metalness > 0` without an
 * environment map, and Part C.1 forbids a runtime CDN dependency; the kit
 * supplies no HDRI, and drei's presets are fetched from a CDN. A procedural
 * environment is authored, versioned and weighs nothing.
 *
 * It also happens to be the right look: the reflections in a machine's painted
 * panels in a real hall are strip lights overhead, which is exactly what these
 * Lightformers are.
 */
export function Stage({ showFloor = true }: { showFloor?: boolean }) {
  return (
    <>
      {/* Key: high and to the front-right, the catalogue's own lighting angle. */}
      <directionalLight
        position={[6, 9, 7]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
      />
      {/* Fill: cool, low, opposite the key, so the shadow side still reads. */}
      <directionalLight position={[-8, 4, -3]} intensity={0.5} color="#8fb4d8" />
      {/* Rim: behind and above, separating the machine from the black field. */}
      <directionalLight position={[-2, 7, -9]} intensity={1.1} color="#cfd8e6" />
      <ambientLight intensity={0.18} />

      <Environment resolution={256} frames={1}>
        {/* Overhead strips — the hall's own lighting, and what the painted
            panels reflect. */}
        <Lightformer form="rect" intensity={3} position={[0, 8, 2]} scale={[14, 2, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={2} position={[0, 8, -4]} scale={[14, 2, 1]} rotation-x={Math.PI / 2} />
        {/* Side bounce, warm one way and cool the other, so the machine is not
            lit flatly from a single grey dome. */}
        <Lightformer form="rect" intensity={1.2} color="#fff2e0" position={[9, 3, 0]} scale={[1, 6, 8]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={0.9} color="#dbe7f5" position={[-9, 3, 0]} scale={[1, 6, 8]} rotation-y={Math.PI / 2} />
        {/* Floor bounce. */}
        <Lightformer form="rect" intensity={0.5} position={[0, -1, 0]} scale={[12, 1, 12]} rotation-x={-Math.PI / 2} />
      </Environment>

      {showFloor ? <Floor /> : null}
    </>
  );
}

/**
 * The hall floor. Catches the machine's shadow and nothing else — it is not a
 * mirror, because a polished-floor reflection is the single fastest way to make
 * an industrial render look like a video game.
 */
function Floor() {
  return (
    <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={0}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#0c0b0a" roughness={0.95} metalness={0} />
    </mesh>
  );
}
