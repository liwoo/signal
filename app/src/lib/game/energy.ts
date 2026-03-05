const BASE_MAX_ENERGY = 100;
const EXTENDED_MAX_ENERGY = 150;
const REGEN_PER_MINUTE = 5;

export function getMaxEnergy(hasExtraCapacity: boolean): number {
  return hasExtraCapacity ? EXTENDED_MAX_ENERGY : BASE_MAX_ENERGY;
}

export function getAttemptCost(attemptNumber: number): number {
  if (attemptNumber <= 1) return 0;
  if (attemptNumber === 2) return 5;
  if (attemptNumber === 3) return 10;
  return 15;
}

export function getHintCost(hintLevel: 1 | 2 | 3): number {
  switch (hintLevel) {
    case 1: return 8;
    case 2: return 12;
    case 3: return 20;
  }
}

export function calculateRegen(
  currentEnergy: number,
  maxEnergy: number,
  elapsedMs: number
): number {
  const regenAmount = Math.floor((elapsedMs / 60_000) * REGEN_PER_MINUTE);
  return Math.min(currentEnergy + regenAmount, maxEnergy);
}

export type EnergyState = "normal" | "warning" | "critical" | "dead";

export function getEnergyState(energy: number, maxEnergy: number): EnergyState {
  const pct = energy / maxEnergy;
  if (energy <= 0) return "dead";
  if (pct <= 0.15) return "critical";
  if (pct <= 0.30) return "warning";
  return "normal";
}
