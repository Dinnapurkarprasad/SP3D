import { cableRecordAreaMm2, fillPct, fillStatus, isPositiveFinite, remainingPct } from "./calc";
import type { FillStatus, TrayResult } from "./types";

export interface WhatIfResult {
  valid: boolean;
  error: string | null;
  currentFillPct: number | null;
  additionalAreaMm2: number | null;
  predictedAreaMm2: number | null;
  predictedFillPct: number | null;
  predictedRemainingPct: number | null;
  predictedStatus: FillStatus;
  verdict: "BELOW_WARNING" | "REACHES_WARNING" | "REACHES_MAX" | "INVALID";
  /** Largest additional cable area (mm²) before the warning / max threshold would be reached. */
  headroomToWarningMm2: number | null;
  headroomToMaxMm2: number | null;
}

/** Predicts fill if a proposed cable (OD, quantity) is added to a tray. Does not mutate any data. */
export function predictWhatIf(tray: TrayResult, odMm: unknown, quantity: unknown): WhatIfResult {
  const base = {
    currentFillPct: tray.fillPct,
    headroomToWarningMm2: tray.grossAreaMm2 === null ? null : (tray.grossAreaMm2 * tray.thresholds.warningPct) / 100 - tray.cableAreaMm2,
    headroomToMaxMm2: tray.grossAreaMm2 === null ? null : (tray.grossAreaMm2 * tray.thresholds.maxPct) / 100 - tray.cableAreaMm2,
  };
  const invalid = (error: string): WhatIfResult => ({
    ...base,
    valid: false,
    error,
    additionalAreaMm2: null,
    predictedAreaMm2: null,
    predictedFillPct: null,
    predictedRemainingPct: null,
    predictedStatus: "DATA_ISSUE",
    verdict: "INVALID",
  });

  if (tray.grossAreaMm2 === null || tray.status === "DATA_ISSUE")
    return invalid(`Tray ${tray.tray.id} has a data issue: ${tray.statusReason}`);
  if (!isPositiveFinite(odMm)) return invalid("Enter a cable outside diameter greater than 0 mm.");
  if (!isPositiveFinite(quantity) || !Number.isInteger(quantity))
    return invalid("Enter a quantity that is a whole number of 1 or more.");

  const add = cableRecordAreaMm2(odMm, quantity);
  const total = tray.cableAreaMm2 + add;
  const fill = fillPct(total, tray.grossAreaMm2);
  const status = fillStatus(fill, tray.thresholds);
  return {
    ...base,
    valid: true,
    error: null,
    additionalAreaMm2: add,
    predictedAreaMm2: total,
    predictedFillPct: fill,
    predictedRemainingPct: remainingPct(fill),
    predictedStatus: status,
    verdict: status === "CHECK_LIMIT" ? "REACHES_MAX" : status === "WARNING" ? "REACHES_WARNING" : "BELOW_WARNING",
  };
}
