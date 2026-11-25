// Builds the full analysis (tray results, cable results, assignment validation, alerts, rules, KPIs)
// from raw data + user settings. Pure function: no React, no browser APIs — fully unit-testable.

import {
  cableRecordAreaMm2,
  cableAreaMm2,
  fillPct as calcFillPct,
  fillStatus,
  remainingPct as calcRemainingPct,
  thresholdsAreValid,
  trayGrossAreaMm2,
} from "./calc";
import { evaluateRules } from "./rules";
import type {
  Alert,
  Analysis,
  AssignmentResult,
  Cable,
  CableResult,
  DemoRule,
  Kpis,
  RouteAssignment,
  ThresholdSettings,
  Thresholds,
  Tray,
  TrayCableLine,
  TrayResult,
} from "./types";
import { validateCable, validateTrayDimensions } from "./validate";
import { fmtPct } from "./format";
import { cableHref, routeHref, trayHref } from "./links";
export { cableHref, routeHref, trayHref };

export interface AnalysisInput {
  trays: Tray[];
  cables: Cable[];
  assignments: RouteAssignment[];
  rules: DemoRule[];
  settings: ThresholdSettings;
}





export function effectiveThresholds(tray: Tray, settings: ThresholdSettings): Thresholds {
  return settings.mode === "global"
    ? settings.global
    : { warningPct: tray.warningThresholdPct, maxPct: tray.maxThresholdPct };
}

/** Validates every assignment: unknown refs, invalid cable data and duplicates (same cable twice in one tray). */
export function validateAssignments(
  assignments: RouteAssignment[],
  trays: Tray[],
  cableResults: Map<string, CableResult>,
): AssignmentResult[] {
  const trayIds = new Set(trays.map((t) => t.id));
  const seen = new Map<string, string>(); // "cableId|trayId" -> first assignment id
  return assignments.map((a): AssignmentResult => {
    const cr = cableResults.get(a.cableId);
    if (!trayIds.has(a.trayId)) {
      return {
        assignment: a,
        status: "UNKNOWN_TRAY",
        trusted: false,
        reason: `Tray "${a.trayId}" is not in the tray register.`,
      };
    }
    if (!cr) {
      return {
        assignment: a,
        status: "UNKNOWN_CABLE",
        trusted: false,
        reason: `Cable "${a.cableId}" is not in the cable schedule.`,
      };
    }
    if (!cr.valid) {
      return {
        assignment: a,
        status: "INVALID_CABLE_DATA",
        trusted: false,
        reason: `Cable ${cr.cable.tag} has invalid OD or quantity; excluded until corrected.`,
      };
    }
    const key = `${a.cableId}|${a.trayId}`;
    const first = seen.get(key);
    if (first) {
      return {
        assignment: a,
        status: "DUPLICATE",
        trusted: false,
        reason: `Same cable already assigned to ${a.trayId} by ${first}; counted once only.`,
      };
    }
    seen.set(key, a.id);
    return { assignment: a, status: "VALID", trusted: true, reason: "Included in fill calculation." };
  });
}

export function analyze(input: AnalysisInput): Analysis {
  const { trays, cables, assignments, rules, settings } = input;

  // 1. Cables
  const cableResults = new Map<string, CableResult>();
  for (const cable of cables) {
    const { valid, issues } = validateCable(cable);
    cableResults.set(cable.id, {
      cable,
      valid,
      issues,
      unitAreaMm2: valid ? cableAreaMm2(cable.outsideDiameterMm) : null,
      totalAreaMm2: valid ? cableRecordAreaMm2(cable.outsideDiameterMm, cable.quantity) : null,
      routedTrayIds: [],
    });
  }

  // 2. Assignments (sorted by cable then sequence for stable "first occurrence" logic)
  const ordered = [...assignments].sort(
    (a, b) => a.cableId.localeCompare(b.cableId) || a.sequence - b.sequence || a.id.localeCompare(b.id),
  );
  const assignmentResultsOrdered = validateAssignments(ordered, trays, cableResults);
  const byId = new Map(assignmentResultsOrdered.map((r) => [r.assignment.id, r]));
  // Report assignments in their original file order.
  const assignmentResults = assignments.map((a) => byId.get(a.id)!);

  for (const r of assignmentResultsOrdered) {
    if (r.trusted) cableResults.get(r.assignment.cableId)!.routedTrayIds.push(r.assignment.trayId);
  }

  // 3. Trays
  const trayResults: TrayResult[] = trays.map((tray) => {
    const dims = validateTrayDimensions(tray);
    const thresholds = effectiveThresholds(tray, settings);
    const tValid = thresholdsAreValid(thresholds);
    const lines: TrayCableLine[] = [];
    let excludedCount = 0;
    let duplicateCount = 0;
    const areaByFamily: Record<string, number> = {};

    for (const r of assignmentResultsOrdered) {
      if (r.assignment.trayId !== tray.id) continue;
      if (!r.trusted) {
        if (r.status === "DUPLICATE") duplicateCount++;
        else excludedCount++;
        continue;
      }
      const cr = cableResults.get(r.assignment.cableId)!;
      lines.push({
        cable: cr.cable,
        unitAreaMm2: cr.unitAreaMm2!,
        totalAreaMm2: cr.totalAreaMm2!,
        assignmentId: r.assignment.id,
      });
      const fam = cr.cable.cableFamily?.trim() || "Unclassified";
      areaByFamily[fam] = (areaByFamily[fam] ?? 0) + cr.totalAreaMm2!;
    }

    const cableArea = lines.reduce((s, l) => s + l.totalAreaMm2, 0);
    const gross = dims.valid ? trayGrossAreaMm2(tray.usableWidthMm, tray.usableHeightMm) : null;
    const fill = gross ? calcFillPct(cableArea, gross) : null;
    const status = fillStatus(fill, thresholds);

    let statusReason: string;
    if (!dims.valid) statusReason = dims.message;
    else if (!tValid)
      statusReason = `Thresholds invalid (warning ${thresholds.warningPct}%, max ${thresholds.maxPct}%) — warning must be > 0 and below max.`;
    else if (status === "CHECK_LIMIT")
      statusReason = `Estimated fill ${fmtPct(fill)} is at/above the configured maximum of ${thresholds.maxPct}%.`;
    else if (status === "WARNING")
      statusReason = `Estimated fill ${fmtPct(fill)} has reached the configured warning threshold of ${thresholds.warningPct}%.`;
    else statusReason = `Estimated fill ${fmtPct(fill)} is below the configured warning threshold of ${thresholds.warningPct}%.`;

    return {
      tray,
      validDimensions: dims.valid,
      thresholds,
      thresholdsValid: tValid,
      grossAreaMm2: gross,
      cableAreaMm2: cableArea,
      fillPct: fill,
      remainingPct: fill === null ? null : calcRemainingPct(fill),
      remainingAreaMm2: gross === null ? null : gross - cableArea,
      status,
      statusReason,
      lines,
      excludedCount,
      duplicateCount,
      areaByFamily,
    };
  });

  // 4. Alerts
  const alerts = buildAlerts(trayResults, [...cableResults.values()], assignmentResults);

  // 5. Rules
  const ruleResults = evaluateRules(rules, trayResults, [...cableResults.values()]);

  // 6. KPIs
  const kpis = buildKpis(trayResults, [...cableResults.values()], assignmentResults, alerts);

  return {
    trays: trayResults,
    cables: [...cableResults.values()],
    assignments: assignmentResults,
    alerts,
    rules: ruleResults,
    kpis,
  };
}

function buildAlerts(trays: TrayResult[], cables: CableResult[], assignments: AssignmentResult[]): Alert[] {
  const alerts: Alert[] = [];

  for (const t of trays) {
    const link = [{ label: `Open tray ${t.tray.id}`, href: trayHref(t.tray.id) }];
    if (t.status === "CHECK_LIMIT") {
      alerts.push({
        id: `AT_MAX-${t.tray.id}`,
        type: "AT_MAX",
        category: "Capacity",
        severity: "critical",
        title: `${t.tray.id} at/above configured maximum`,
        message: `Tray ${t.tray.id} reaches/exceeds the configured maximum. Engineering review required.`,
        reason: t.statusReason,
        links: link,
      });
    } else if (t.status === "WARNING") {
      alerts.push({
        id: `NEAR-${t.tray.id}`,
        type: "NEAR_THRESHOLD",
        category: "Capacity",
        severity: "warning",
        title: `${t.tray.id} approaching configured threshold`,
        message: `Tray ${t.tray.id} is approaching its configured threshold.`,
        reason: t.statusReason,
        links: link,
      });
    } else if (t.status === "DATA_ISSUE") {
      alerts.push({
        id: `INVALID_TRAY-${t.tray.id}`,
        type: "INVALID_TRAY",
        category: "Data quality",
        severity: "critical",
        title: `${t.tray.id} cannot be assessed`,
        message: `Tray ${t.tray.id} has invalid dimensions or threshold settings.`,
        reason: t.statusReason,
        links: link,
      });
    }
  }

  for (const c of cables) {
    const odQty = c.issues.filter((i) => i.field !== "cableFamily");
    if (odQty.length) {
      alerts.push({
        id: `INVALID_OD_QTY-${c.cable.id}`,
        type: "INVALID_OD_QTY",
        category: "Data quality",
        severity: "critical",
        title: `${c.cable.tag}: invalid OD/quantity`,
        message: "Cable record has invalid OD or quantity.",
        reason: `${odQty.map((i) => i.message).join(" ")} The record is excluded from trusted fill calculations, so affected tray fills may be understated.`,
        links: [{ label: `Open cable ${c.cable.tag}`, href: cableHref(c.cable.id) }],
      });
    }
    if (c.issues.some((i) => i.field === "cableFamily")) {
      alerts.push({
        id: `UNCLASSIFIED-${c.cable.id}`,
        type: "UNCLASSIFIED",
        category: "Data quality",
        severity: "warning",
        title: `${c.cable.tag}: cable family missing`,
        message: "Cable family is not classified; rule review is incomplete.",
        reason: "The cableFamily field is empty. The cable still counts toward fill, but segregation rules cannot be checked for it.",
        links: [{ label: `Open cable ${c.cable.tag}`, href: cableHref(c.cable.id) }],
      });
    }
  }

  for (const r of assignments) {
    const a = r.assignment;
    const routeLink = { label: `Open route ${a.id}`, href: routeHref(a.id) };
    if (r.status === "UNKNOWN_TRAY") {
      alerts.push({
        id: `UNKNOWN_TRAY-${a.id}`,
        type: "UNKNOWN_TRAY",
        category: "Data quality",
        severity: "critical",
        title: `${a.id}: unknown tray ${a.trayId}`,
        message: "Assignment references an unknown tray ID.",
        reason: `${r.reason} The assignment is excluded from calculations until corrected.`,
        links: [routeLink, { label: `Open cable ${a.cableId}`, href: cableHref(a.cableId) }],
      });
    } else if (r.status === "UNKNOWN_CABLE") {
      alerts.push({
        id: `UNKNOWN_CABLE-${a.id}`,
        type: "UNKNOWN_CABLE",
        category: "Data quality",
        severity: "critical",
        title: `${a.id}: unknown cable ${a.cableId}`,
        message: "Assignment references a missing cable record.",
        reason: `${r.reason} The assignment is excluded from calculations until corrected.`,
        links: [routeLink, { label: `Open tray ${a.trayId}`, href: trayHref(a.trayId) }],
      });
    } else if (r.status === "DUPLICATE") {
      alerts.push({
        id: `DUP-${a.id}`,
        type: "DUPLICATE_ASSIGNMENT",
        category: "Data quality",
        severity: "warning",
        title: `${a.id}: duplicate assignment of ${a.cableId} in ${a.trayId}`,
        message: "Cable is assigned to the same tray segment more than once.",
        reason: `${r.reason} Remove the duplicate route record.`,
        links: [routeLink, { label: `Open tray ${a.trayId}`, href: trayHref(a.trayId) }],
      });
    }
  }

  const sevOrder = { critical: 0, warning: 1, info: 2 } as const;
  return alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
}

function buildKpis(
  trays: TrayResult[],
  cables: CableResult[],
  assignments: AssignmentResult[],
  alerts: Alert[],
): Kpis {
  const fills = trays.filter((t) => t.fillPct !== null) as (TrayResult & { fillPct: number })[];
  const highest = fills.reduce<TrayResult | null>(
    (best, t) => (best === null || (t.fillPct ?? 0) > (best.fillPct ?? 0) ? t : best),
    null,
  );
  return {
    trayCount: trays.length,
    cableRecordCount: cables.length,
    cablePieceCount: cables.reduce(
      (s, c) => s + (Number.isInteger(c.cable.quantity) && c.cable.quantity > 0 ? c.cable.quantity : 0),
      0,
    ),
    trustedAssignmentCount: assignments.filter((a) => a.trusted).length,
    highestFill: highest ? { trayId: highest.tray.id, fillPct: highest.fillPct! } : null,
    averageFillPct: fills.length ? fills.reduce((s, t) => s + t.fillPct, 0) / fills.length : null,
    warningCount: trays.filter((t) => t.status === "WARNING").length,
    checkLimitCount: trays.filter((t) => t.status === "CHECK_LIMIT").length,
    dataIssueAlertCount: alerts.filter((a) => a.category === "Data quality").length,
    capacityAlertCount: alerts.filter((a) => a.category === "Capacity").length,
  };
}
