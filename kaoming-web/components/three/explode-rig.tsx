'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import { Color, Vector3, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { easeInOutCubic, explodeState, partProgress, readRig, type RigPart } from '@/lib/three/rig';
import { damp, useSceneScroll } from '@/lib/three/scroll-state';

/**
 * Scenes 04 → 06 (Part G.4, G.6, G.8): the machine comes apart, is read, and is
 * put back together.
 *
 * Every part's position is written from scroll progress each frame — there is no
 * timeline and no playhead, exactly as in Scene 03. That is what makes the
 * disassembly scrub identically in both directions, and what makes the
 * reassembly in Scene 06 literally the same code running backwards rather than a
 * second animation that has to be kept in step with the first.
 *
 * The rig itself is read from the model (lib/three/rig), so this component does
 * not know or care whether it is driving the scale blockout or the artist's GLB.
 */

/** Part G.6: the focused component lifts, its siblings fall back. */
const HIGHLIGHT = new Color('#64a9da');
const HIGHLIGHT_INTENSITY = 0.55;
const DIM = 0.45;
const HIGHLIGHT_EASE = 0.18;

type Tracked = {
  part: RigPart;
  material: MeshStandardMaterial | null;
  baseColor: Color;
  baseEmissive: Color;
  baseEmissiveIntensity: number;
  /** Eased 0–1: 1 focused, 0 at rest, negative side handled by `dim`. */
  lift: number;
  dim: number;
};

/**
 * A read-only window onto the rig, the same seam SceneProbe opens onto the
 * camera. `spread` is the total distance every part has travelled from rest, in
 * metres — one number that says whether the machine is together, coming apart,
 * or open, and which can be compared between two scroll positions to prove the
 * disassembly scrubs deterministically.
 *
 * One object, mutated in place: no allocation per frame (Part O).
 */
declare global {
  interface Window {
    __kmRig?: { parts: number; amount: number; spread: number; active: string };
  }
}

export function ExplodeRig({
  root,
  /** KM_* object name the visitor is reading, or null. */
  activeObject,
}: {
  root: RefObject<Group | null>;
  activeObject: string | null;
}) {
  const scroll = useSceneScroll();
  const tracked = useRef<Tracked[]>([]);
  const maxOrder = useRef(0);
  const offset = useRef(new Vector3());
  const world = useRef(new Vector3());
  const probe = useRef<NonNullable<Window['__kmRig']>>({
    parts: 0,
    amount: 0,
    spread: 0,
    active: '',
  });

  useEffect(() => {
    window.__kmRig = probe.current;
    return () => {
      delete window.__kmRig;
    };
  }, []);

  useEffect(() => {
    const group = root.current;
    if (!group) return;

    const parts = readRig(group);
    maxOrder.current = parts.reduce((max, part) => Math.max(max, part.order), 0);

    tracked.current = parts.map((part) => {
      const mesh = part.object as Mesh;
      // The GLB may share one material across several parts; highlighting one
      // would then light all of them. A clone per part costs a few materials
      // and removes the whole class of bug.
      const source = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
        | MeshStandardMaterial
        | undefined;
      const material = source ? (source.clone() as MeshStandardMaterial) : null;
      if (material) mesh.material = material;

      return {
        part,
        material,
        baseColor: material ? material.color.clone() : new Color(),
        baseEmissive: material ? material.emissive.clone() : new Color(),
        baseEmissiveIntensity: material?.emissiveIntensity ?? 1,
        lift: 0,
        dim: 0,
      };
    });

    return () => {
      for (const entry of tracked.current) {
        entry.part.object.position.copy(entry.part.rest);
        entry.material?.dispose();
      }
      tracked.current = [];
    };
  }, [root]);

  useFrame((state, delta) => {
    const entries = tracked.current;
    if (!entries.length) return;

    const explode = explodeState(scroll.current.explodeCurrent);
    const anyActive = activeObject !== null;
    let spread = 0;

    for (const entry of entries) {
      const { part } = entry;

      // --- Position. Pure function of progress; nothing accumulates.
      const local = partProgress(
        explode.amount,
        part.order,
        maxOrder.current,
        explode.tighten,
      );
      const travel = part.distance * easeInOutCubic(local);
      offset.current.copy(part.vector).multiplyScalar(travel);
      part.object.position.copy(part.rest).add(offset.current);
      spread += travel;

      // --- Highlight. Eased with the same framerate-independent damping the
      // camera uses, so a focus ring does not snap at 144Hz and crawl at 30.
      const wantsLift = activeObject === part.name ? 1 : 0;
      const wantsDim = anyActive && activeObject !== part.name ? 1 : 0;
      entry.lift = damp(entry.lift, wantsLift, HIGHLIGHT_EASE, delta);
      entry.dim = damp(entry.dim, wantsDim, HIGHLIGHT_EASE, delta);

      const material = entry.material;
      if (material) {
        material.emissive.copy(entry.baseEmissive).lerp(HIGHLIGHT, entry.lift);
        material.emissiveIntensity =
          entry.baseEmissiveIntensity + HIGHLIGHT_INTENSITY * entry.lift;
        material.color
          .copy(entry.baseColor)
          .multiplyScalar(1 - (1 - DIM) * entry.dim);
      }

      // --- Projection, for the DOM leader lines. One mutated record, no
      // allocation per frame (Part O).
      part.object.getWorldPosition(world.current);
      world.current.project(state.camera);
      const store = scroll.current.projections;
      const slot = (store[part.name] ??= { x: 0, y: 0, visible: false });
      slot.x = (world.current.x + 1) / 2;
      slot.y = (1 - world.current.y) / 2;
      slot.visible = world.current.z < 1;
    }

    const value = probe.current;
    value.parts = entries.length;
    value.amount = explode.amount;
    value.spread = spread;
    value.active = activeObject ?? '';
  });

  // Reduced motion needs no branch here: no explode trigger is created, so
  // progress stays at zero and every part stays home. The component information
  // in Scene 05 is DOM either way, so nothing is lost (Part P).
  return null;
}
