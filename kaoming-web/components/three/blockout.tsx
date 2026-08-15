'use client';

import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { KMC_325GM_DIMENSIONS as D } from '@/lib/three/models';

/**
 * A SCALE BLOCKOUT — not the machine.
 *
 * The KMC-325GM model does not exist yet (see lib/three/models). Rather than
 * fake a machine, this puts the catalogue's own dimensions into the scene as
 * plain volumes: 9.3 m of floor length, 6.5 m across, 5.8 m tall, a 3.0 × 2.0 m
 * table between columns 2.5 m apart. Every figure is transcribed from the GM
 * specification table; none is invented.
 *
 * It is deliberately built as flat grey boxes so that nobody, at any moment,
 * could mistake it for a KAO MING product render.
 *
 * Object names AND the explode rig follow the H.2 authoring contract, so the
 * code that reads the artist's GLB is the code reading this. Each mesh carries
 * `explodeVec`, `explodeDist`, `explodeOrder`, `group` and `conceptual` in its
 * userData, exactly as a Blender custom property would arrive.
 */

type Part = {
  name: string;
  size: [number, number, number];
  position: [number, number, number];
  tone: 'base' | 'structure' | 'moving' | 'head';
  /** Omitted for the anchor, which never moves (Part G.4). */
  rig?: {
    explodeVec: [number, number, number];
    explodeDist: number;
    explodeOrder: number;
    group: string;
    conceptual: boolean;
  };
};

const TONES: Record<Part['tone'], { color: string; roughness: number }> = {
  base: { color: '#2a2a2a', roughness: 0.85 },
  structure: { color: '#8a8a8a', roughness: 0.7 },
  moving: { color: '#6f6f6f', roughness: 0.6 },
  head: { color: '#b0b0b0', roughness: 0.45 },
};

/**
 * Machine axes to three.js: machine X (table travel) -> x, machine Y (across,
 * between the columns) -> z, machine Z (vertical) -> y.
 *
 * The explode order is Part G.4's: base anchors, columns separate laterally,
 * crossbeam rises, saddle and ram move forward, the head goes forward-down, the
 * spindle drops out of it, then the table slides out and the magazine fans away.
 */
function buildParts(): Part[] {
  const baseHeight = 0.9;
  const columnHeight = D.heightM - baseHeight - 0.9;
  const columnThickness = 0.7;
  const columnOffset = D.columnGapM / 2 + columnThickness / 2;
  const crossbeamY = baseHeight + columnHeight;
  const headX = -D.travel.xM * 0.25;

  return [
    {
      name: 'KM_base',
      size: [D.floorLengthM, baseHeight, D.floorWidthM * 0.55],
      position: [0, baseHeight / 2, 0],
      tone: 'base',
    },
    {
      name: 'KM_table',
      size: [D.tableLengthM, 0.28, D.tableWidthM],
      position: [0, baseHeight + 0.14, 0],
      tone: 'moving',
      rig: { explodeVec: [-1, 0, 0], explodeDist: 4.2, explodeOrder: 6, group: 'axis', conceptual: false },
    },
    {
      name: 'KM_column_L',
      size: [1.5, columnHeight, columnThickness],
      position: [headX, baseHeight + columnHeight / 2, -columnOffset],
      tone: 'structure',
      rig: { explodeVec: [0, 0, -1], explodeDist: 3.2, explodeOrder: 1, group: 'structure', conceptual: false },
    },
    {
      name: 'KM_column_R',
      size: [1.5, columnHeight, columnThickness],
      position: [headX, baseHeight + columnHeight / 2, columnOffset],
      tone: 'structure',
      rig: { explodeVec: [0, 0, 1], explodeDist: 3.2, explodeOrder: 1, group: 'structure', conceptual: false },
    },
    {
      name: 'KM_crossbeam',
      size: [1.7, 0.9, D.columnGapM + columnThickness * 2],
      position: [headX, crossbeamY + 0.45, 0],
      tone: 'structure',
      rig: { explodeVec: [0, 1, 0], explodeDist: 3.0, explodeOrder: 2, group: 'structure', conceptual: false },
    },
    {
      name: 'KM_saddle',
      size: [1.1, 0.7, 1.2],
      position: [headX, crossbeamY + 0.35, 0],
      tone: 'moving',
      rig: { explodeVec: [1, 0, 0], explodeDist: 2.6, explodeOrder: 3, group: 'axis', conceptual: false },
    },
    {
      name: 'KM_ram',
      size: [0.6, D.travel.zM + 0.8, 0.6],
      position: [headX, crossbeamY - D.travel.zM * 0.35, 0],
      tone: 'moving',
      rig: { explodeVec: [1, 0, 0], explodeDist: 3.4, explodeOrder: 3, group: 'axis', conceptual: false },
    },
    {
      name: 'KM_spindle_head',
      size: [0.5, 0.7, 0.5],
      position: [headX, crossbeamY - D.travel.zM * 0.9, 0],
      tone: 'head',
      rig: { explodeVec: [0.88, -0.47, 0], explodeDist: 3.8, explodeOrder: 4, group: 'spindle', conceptual: false },
    },
    {
      name: 'KM_spindle',
      size: [0.26, 0.5, 0.26],
      position: [headX, crossbeamY - D.travel.zM * 0.9 - 0.55, 0],
      tone: 'head',
      rig: { explodeVec: [0, -1, 0], explodeDist: 2.2, explodeOrder: 5, group: 'spindle', conceptual: false },
    },
    {
      name: 'KM_atc',
      size: [0.9, 1.6, 0.7],
      position: [headX + 1.4, crossbeamY - 1.2, columnOffset + 0.6],
      tone: 'moving',
      rig: { explodeVec: [-0.35, 0.28, 0.89], explodeDist: 3.6, explodeOrder: 6, group: 'spindle', conceptual: false },
    },
  ];
}

export function Blockout({ visible = true }: { visible?: boolean }) {
  const group = useRef<Group>(null);
  const parts = useMemo(buildParts, []);

  return (
    <group ref={group} name="KM_blockout" visible={visible}>
      {parts.map((part) => (
        <mesh
          key={part.name}
          name={part.name}
          position={part.position}
          userData={part.rig ?? {}}
          castShadow
          receiveShadow
        >
          <boxGeometry args={part.size} />
          <meshStandardMaterial
            color={TONES[part.tone].color}
            roughness={TONES[part.tone].roughness}
            // Zero metalness throughout: Part 0.4 forbids metal without an
            // environment map, and a blockout has no business pretending to be
            // machined steel in any case.
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}

/** The machine's overall extent, used to frame the camera and size the grid. */
export const BLOCKOUT_BOUNDS = {
  lengthM: D.floorLengthM,
  widthM: D.floorWidthM,
  heightM: D.heightM,
  centreY: D.heightM / 2,
};
