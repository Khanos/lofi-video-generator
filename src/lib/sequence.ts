import type { LoopMode } from "../types/video";

export function normalizedFrameName(index: number) {
  return `${index.toString().padStart(6, "0")}.png`;
}

export function buildLoopSequence(count: number, mode: LoopMode): number[] {
  const base = Array.from({ length: count }, (_, index) => index);

  if (mode === "closed" && count > 1) {
    return [...base, 0];
  }

  if (mode === "pingpong" && count > 2) {
    return [...base, ...base.slice(1, -1).reverse(), 0];
  }

  return base;
}

export function expForMultiplier(multiplier: number) {
  return Math.round(Math.log2(multiplier));
}
