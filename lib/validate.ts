import { isPositiveFinite } from "./calc";
import type { Cable, CableIssue, Tray } from "./types";

/** Validates OD, quantity and family of a cable record. OD/quantity problems make the record untrusted. */
export function validateCable(cable: Cable): { valid: boolean; issues: CableIssue[] } {
  const issues: CableIssue[] = [];
  const od: unknown = cable.outsideDiameterMm;
  const qty: unknown = cable.quantity;

  if (!isPositiveFinite(od)) {
    issues.push({
      field: "outsideDiameterMm",
      message: `Outside diameter is ${describeBadNumber(od)} — must be a positive number in mm.`,
    });
  }
  if (!isPositiveFinite(qty) || !Number.isInteger(qty)) {
    issues.push({
      field: "quantity",
      message: `Quantity is ${describeBadNumber(qty)} — must be a positive whole number.`,
    });
  }
  if (typeof cable.cableFamily !== "string" || cable.cableFamily.trim() === "") {
    issues.push({ field: "cableFamily", message: "Cable family is missing — rule review is incomplete." });
  }

  // A missing family does not invalidate the area calculation; bad OD/quantity does.
  const valid = !issues.some((i) => i.field === "outsideDiameterMm" || i.field === "quantity");
  return { valid, issues };
}

export function validateTrayDimensions(tray: Tray): { valid: boolean; message: string } {
  const w: unknown = tray.usableWidthMm;
  const h: unknown = tray.usableHeightMm;
  if (!isPositiveFinite(w) || !isPositiveFinite(h)) {
    return {
      valid: false,
      message: `Usable width/height must be positive numbers (width: ${describeBadNumber(w)}, height: ${describeBadNumber(h)}).`,
    };
  }
  return { valid: true, message: "" };
}

export function describeBadNumber(v: unknown): string {
  if (v === null || v === undefined || v === "") return "missing";
  if (typeof v !== "number") return `non-numeric ("${String(v)}")`;
  if (!Number.isFinite(v)) return "not a finite number";
  if (v === 0) return "zero";
  if (v < 0) return `negative (${v})`;
  if (!Number.isInteger(v)) return `not a whole number (${v})`;
  return String(v);
}
