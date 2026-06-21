/**
 * shared/avatar-engine/AvatarEngine.ts
 *
 * Section 7.3: one small state machine driven by events from either
 * module. Kept deliberately simple — this is a mood indicator, not a game
 * engine. Rendering lives in shared/ui/Avatar.tsx as plain SVG/CSS.
 */
import { create } from "zustand";
import type { AvatarState } from "../../types";

interface AvatarStore {
  state: AvatarState;
  lastTipTa: string | null;
  setState: (state: AvatarState, tipTa?: string) => void;
}

export const useAvatarStore = create<AvatarStore>((set) => ({
  state: "idle",
  lastTipTa: null,
  setState: (state, tipTa) => set({ state, lastTipTa: tipTa ?? null }),
}));

/** Crop growth events (Farm module) */
export function reportGrowthOnTrack() {
  useAvatarStore.getState().setState("growing");
}

export function reportGrowthLagging(tipTa: string) {
  useAvatarStore.getState().setState("concerned", tipTa);
}

export function reportHarvestReady() {
  useAvatarStore.getState().setState("celebrating");
}

/** Fabrication events */
export function reportSketchCompleted() {
  useAvatarStore.getState().setState("celebrating");
  // Avatar returns to idle after a short celebration beat.
  setTimeout(() => useAvatarStore.getState().setState("idle"), 4000);
}
