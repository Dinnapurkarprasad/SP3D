// Single source of truth for the V1 simplified tray-fill calculations.
// These are EDUCATIONAL geometric estimates, not a certified tray-fill calculation.

import type { FillStatus, Thresholds } from "./types";

/** Cable cross-sectional area (mm²) = PI * (outsideDiameterMm / 2)² */
export function cableAreaMm2(outsideDiameterMm: number): number {
  return Math.PI * Math.pow(outsideDiameterMm / 2, 2);
}

/** Total area for a cable record (mm²) = cable cross-sectional area * quantity */
export function cableRecordAreaMm2(outsideDiameterMm: number, quantity: number): number {
  return cableAreaMm2(outsideDiameterMm) * quantity;
}

/** Gross rectangular tray area (mm²) = usableWidthMm * usableHeightMm */
export function trayGrossAreaMm2(usableWidthMm: number, usableHeightMm: number): number {
  return usableWidthMm * usableHeightMm;
}

/** Estimated fill percentage (%) = (sum of assigned cable areas / gross tray area) * 100 */
export function fillPct(sumCableAreaMm2: number, grossTrayAreaMm2: number): number {
  return (sumCableAreaMm2 / grossTrayAreaMm2) * 100;
}

/** Estimated remaining percentage (%) = 100 - fill. Never clamped: can be negative. */
export function remainingPct(fill: number): number {
  return 100 - fill;
}

export function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function thresholdsAreValid(t: Thresholds): boolean {
  return (
    typeof t.warningPct === "number" &&
    typeof t.maxPct === "number" &&
    Number.isFinite(t.warningPct) &&
    Number.isFinite(t.maxPct) &&
    t.warningPct > 0 &&
    t.maxPct > t.warningPct
  );
}

/**
 * Threshold/status logic:
 *  fill < warning            -> OK
 *  warning <= fill < max     -> WARNING
 *  fill >= max               -> CHECK_LIMIT
 *  invalid / missing data    -> DATA_ISSUE
 */
export function fillStatus(fill: number | null, t: Thresholds): FillStatus {
  if (fill === null || !Number.isFinite(fill) || !thresholdsAreValid(t)) return "DATA_ISSUE";
  if (fill >= t.maxPct) return "CHECK_LIMIT";
  if (fill >= t.warningPct) return "WARNING";
  return "OK";
}

export const STATUS_LABEL: Record<FillStatus, string> = {
  OK: "OK",
  WARNING: "WARNING",
  CHECK_LIMIT: "CHECK LIMIT",
  DATA_ISSUE: "DATA ISSUE",
};
