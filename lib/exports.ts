// CSV builders shared by Trays, Cables, Routes and Reports pages.
import { STATUS_LABEL } from "./calc";
import { round, toCsv } from "./csv";
import { project } from "./data";
import type { AssignmentResult, CableResult, ThresholdSettings, TrayResult } from "./types";

function preamble(title: string, settings: ThresholdSettings, filterNote?: string): string[] {
  return [
    `${title} — SIMULATED DATA — educational estimate, not a certified tray-fill calculation`,
    `Project: ${project.name} | Rev ${project.revision} | Generated ${new Date().toISOString()}`,
    `Units: dimensions mm, areas mm², fill %. Thresholds: ${
      settings.mode === "global"
        ? `global override ${settings.global.warningPct}% warning / ${settings.global.maxPct}% max`
        : "per-tray values from trays.json"
    } (user-configured, illustrative)`,
    ...(filterNote ? [`Filter: ${filterNote}`] : []),
  ];
}

export function trayAnalysisCsv(trays: TrayResult[], settings: ThresholdSettings, filterNote?: string) {
  return toCsv(
    trays,
    [
      { header: "Tray ID", value: (t) => t.tray.id },
      { header: "Role", value: (t) => t.tray.role },
      { header: "Area", value: (t) => t.tray.area },
      { header: "Level", value: (t) => t.tray.level },
      { header: "Tray type", value: (t) => t.tray.trayType },
      { header: "Usable width (mm)", value: (t) => t.tray.usableWidthMm },
      { header: "Usable height (mm)", value: (t) => t.tray.usableHeightMm },
      { header: "Gross tray area (mm²)", value: (t) => round(t.grossAreaMm2, 0) },
      { header: "Assigned cable area (mm²)", value: (t) => round(t.cableAreaMm2, 1) },
      { header: "Estimated fill (%)", value: (t) => round(t.fillPct, 2) },
      { header: "Estimated remaining (%)", value: (t) => round(t.remainingPct, 2) },
      { header: "Remaining area (mm²)", value: (t) => round(t.remainingAreaMm2, 0) },
      { header: "Warning threshold (%)", value: (t) => t.thresholds.warningPct },
      { header: "Maximum threshold (%)", value: (t) => t.thresholds.maxPct },
      { header: "Status", value: (t) => STATUS_LABEL[t.status] },
      { header: "Trusted cable assignments", value: (t) => t.lines.length },
      { header: "Excluded assignments (invalid data)", value: (t) => t.excludedCount },
      { header: "Duplicate assignments ignored", value: (t) => t.duplicateCount },
      { header: "Status reason", value: (t) => t.statusReason },
    ],
    preamble("Tray analysis", settings, filterNote),
  );
}

export function cableScheduleCsv(cables: CableResult[], settings: ThresholdSettings, filterNote?: string) {
  return toCsv(
    cables,
    [
      { header: "Cable ID", value: (c) => c.cable.id },
      { header: "Tag", value: (c) => c.cable.tag },
      { header: "From", value: (c) => c.cable.fromEquipment },
      { header: "To", value: (c) => c.cable.toEquipment },
      { header: "Cable type", value: (c) => c.cable.cableType },
      { header: "Cable family", value: (c) => c.cable.cableFamily || "Unclassified" },
      { header: "Outside diameter (mm)", value: (c) => (typeof c.cable.outsideDiameterMm === "number" ? c.cable.outsideDiameterMm : String(c.cable.outsideDiameterMm ?? "")) },
      { header: "Quantity", value: (c) => (typeof c.cable.quantity === "number" ? c.cable.quantity : String(c.cable.quantity ?? "")) },
      { header: "Area per cable (mm²)", value: (c) => round(c.unitAreaMm2, 1) },
      { header: "Total record area (mm²)", value: (c) => round(c.totalAreaMm2, 1) },
      { header: "Routed trays (valid)", value: (c) => c.routedTrayIds.join(" > ") },
      { header: "Data valid", value: (c) => (c.valid ? "Yes" : "No") },
      { header: "Issues", value: (c) => c.issues.map((i) => i.message).join(" | ") },
      { header: "Origin", value: (c) => c.cable.origin ?? "source" },
    ],
    preamble("Cable schedule", settings, filterNote),
  );
}

export function routeAssignmentsCsv(rows: AssignmentResult[], settings: ThresholdSettings, filterNote?: string) {
  return toCsv(
    rows,
    [
      { header: "Assignment ID", value: (r) => r.assignment.id },
      { header: "Cable ID", value: (r) => r.assignment.cableId },
      { header: "Tray ID", value: (r) => r.assignment.trayId },
      { header: "Segment", value: (r) => r.assignment.segmentName },
      { header: "Sequence", value: (r) => r.assignment.sequence },
      { header: "Validation status", value: (r) => r.status },
      { header: "Included in calculation", value: (r) => (r.trusted ? "Yes" : "No") },
      { header: "Reason", value: (r) => r.reason },
      { header: "Notes", value: (r) => r.assignment.notes },
    ],
    preamble("Route assignments", settings, filterNote),
  );
}

export const stamp = () => new Date().toISOString().slice(0, 10);
