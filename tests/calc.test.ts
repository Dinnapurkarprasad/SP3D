import { describe, expect, it } from "vitest";
import { cableAreaMm2, cableRecordAreaMm2, fillPct, fillStatus, remainingPct, trayGrossAreaMm2 } from "@/lib/calc";
import { analyze } from "@/lib/analysis";
import { predictWhatIf } from "@/lib/whatif";
import { escapeCsv, toCsv } from "@/lib/csv";
import { validateCable } from "@/lib/validate";
import { sourceAssignments, sourceCables, sourceRules, sourceTrays } from "@/lib/data";
import type { Cable, RouteAssignment, ThresholdSettings, Tray } from "@/lib/types";

const settings: ThresholdSettings = { mode: "tray", global: { warningPct: 30, maxPct: 40 } };

const tray = (id: string, w = 100, h = 50): Tray => ({
  id,
  role: "",
  area: "",
  level: "",
  trayType: "",
  usableWidthMm: w,
  usableHeightMm: h,
  warningThresholdPct: 30,
  maxThresholdPct: 40,
});
const cable = (id: string, od: number, qty = 1, family = "LV Power"): Cable => ({
  id,
  tag: id,
  fromEquipment: "A",
  toEquipment: "B",
  cableType: "",
  cableFamily: family,
  outsideDiameterMm: od,
  quantity: qty,
  description: "",
});
const ra = (id: string, cableId: string, trayId: string, sequence = 1): RouteAssignment => ({
  id,
  cableId,
  trayId,
  segmentName: "",
  sequence,
  notes: "",
});

describe("calc formulas", () => {
  it("cable area = PI * (OD/2)^2", () => {
    expect(cableAreaMm2(20)).toBeCloseTo(314.159, 2);
    expect(cableRecordAreaMm2(42, 2)).toBeCloseTo(2 * Math.PI * 21 * 21, 6);
  });
  it("tray area, fill and remaining", () => {
    expect(trayGrossAreaMm2(300, 50)).toBe(15000);
    expect(fillPct(3000, 15000)).toBeCloseTo(20);
    expect(remainingPct(20)).toBe(80);
  });
  it("remaining is not clamped when fill > 100%", () => {
    expect(remainingPct(125)).toBe(-25);
  });
  it("status boundaries", () => {
    const t = { warningPct: 30, maxPct: 40 };
    expect(fillStatus(29.99, t)).toBe("OK");
    expect(fillStatus(30, t)).toBe("WARNING");
    expect(fillStatus(39.99, t)).toBe("WARNING");
    expect(fillStatus(40, t)).toBe("CHECK_LIMIT");
    expect(fillStatus(null, t)).toBe("DATA_ISSUE");
    expect(fillStatus(10, { warningPct: 50, maxPct: 40 })).toBe("DATA_ISSUE");
  });
});

describe("validation", () => {
  it("flags zero, negative, non-numeric OD and quantity", () => {
    expect(validateCable(cable("a", 0)).valid).toBe(false);
    expect(validateCable(cable("a", -5)).valid).toBe(false);
    expect(validateCable({ ...cable("a", 10), outsideDiameterMm: "12" as unknown as number }).valid).toBe(false);
    expect(validateCable(cable("a", 10, 0)).valid).toBe(false);
    expect(validateCable(cable("a", 10, 1.5)).valid).toBe(false);
  });
  it("missing family is an issue but does not invalidate area", () => {
    const r = validateCable(cable("a", 10, 1, ""));
    expect(r.valid).toBe(true);
    expect(r.issues.map((i) => i.field)).toContain("cableFamily");
  });
});

describe("aggregation", () => {
  it("sums cable areas per tray and counts multi-segment cables in each tray", () => {
    const a = analyze({
      trays: [tray("T1"), tray("T2")],
      cables: [cable("C1", 20, 2), cable("C2", 10)],
      assignments: [ra("R1", "C1", "T1"), ra("R2", "C1", "T2", 2), ra("R3", "C2", "T1")],
      rules: [],
      settings,
    });
    const t1 = a.trays.find((t) => t.tray.id === "T1")!;
    const t2 = a.trays.find((t) => t.tray.id === "T2")!;
    expect(t1.cableAreaMm2).toBeCloseTo(2 * cableAreaMm2(20) + cableAreaMm2(10));
    expect(t2.cableAreaMm2).toBeCloseTo(2 * cableAreaMm2(20));
  });
  it("does not count the same cable twice in one tray", () => {
    const a = analyze({
      trays: [tray("T1")],
      cables: [cable("C1", 20)],
      assignments: [ra("R1", "C1", "T1"), ra("R2", "C1", "T1", 2)],
      rules: [],
      settings,
    });
    expect(a.trays[0].cableAreaMm2).toBeCloseTo(cableAreaMm2(20));
    expect(a.assignments.find((r) => r.assignment.id === "R2")!.status).toBe("DUPLICATE");
    expect(a.alerts.some((al) => al.type === "DUPLICATE_ASSIGNMENT")).toBe(true);
  });
  it("excludes unknown tray / unknown cable / invalid cable and raises alerts", () => {
    const a = analyze({
      trays: [tray("T1")],
      cables: [cable("C1", 20), cable("BAD", 0)],
      assignments: [ra("R1", "C1", "TX"), ra("R2", "NOPE", "T1"), ra("R3", "BAD", "T1")],
      rules: [],
      settings,
    });
    expect(a.trays[0].cableAreaMm2).toBe(0);
    expect(a.trays[0].excludedCount).toBe(2);
    const types = a.alerts.map((x) => x.type);
    expect(types).toEqual(expect.arrayContaining(["UNKNOWN_TRAY", "UNKNOWN_CABLE", "INVALID_OD_QTY"]));
  });
  it("shows negative remaining when overfilled", () => {
    const a = analyze({
      trays: [tray("T1", 10, 10)],
      cables: [cable("C1", 20)],
      assignments: [ra("R1", "C1", "T1")],
      rules: [],
      settings,
    });
    expect(a.trays[0].remainingPct!).toBeLessThan(0);
    expect(a.trays[0].status).toBe("CHECK_LIMIT");
  });
  it("global threshold override changes status consistently", () => {
    const input = {
      trays: [tray("T1")],
      cables: [cable("C1", 40)], // 1256.6 / 5000 = 25.1%
      assignments: [ra("R1", "C1", "T1")],
      rules: [],
    };
    expect(analyze({ ...input, settings }).trays[0].status).toBe("OK");
    const g = analyze({ ...input, settings: { mode: "global", global: { warningPct: 20, maxPct: 25 } } });
    expect(g.trays[0].status).toBe("CHECK_LIMIT");
    expect(g.alerts.some((x) => x.type === "AT_MAX")).toBe(true);
  });
});

describe("what-if", () => {
  const a = analyze({
    trays: [tray("T1")],
    cables: [cable("C1", 40)],
    assignments: [ra("R1", "C1", "T1")],
    rules: [],
    settings,
  });
  it("predicts fill without mutating the tray", () => {
    const before = a.trays[0].cableAreaMm2;
    const r = predictWhatIf(a.trays[0], 20, 2);
    expect(r.valid).toBe(true);
    expect(r.predictedFillPct!).toBeCloseTo(((cableAreaMm2(40) + 2 * cableAreaMm2(20)) / 5000) * 100);
    expect(a.trays[0].cableAreaMm2).toBe(before);
  });
  it("rejects invalid inputs", () => {
    expect(predictWhatIf(a.trays[0], 0, 1).valid).toBe(false);
    expect(predictWhatIf(a.trays[0], 10, 0).valid).toBe(false);
  });
});

describe("csv", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(escapeCsv('3C x 95, "armoured"')).toBe('"3C x 95, ""armoured"""');
    expect(toCsv([{ a: 1 }], [{ header: "A (mm)", value: (r) => r.a }])).toBe("A (mm)\r\n1\r\n");
  });
});

describe("demo dataset", () => {
  const a = analyze({
    trays: sourceTrays,
    cables: sourceCables,
    assignments: sourceAssignments,
    rules: sourceRules,
    settings,
  });
  it("produces the intended demo story", () => {
    const s = Object.fromEntries(a.trays.map((t) => [t.tray.id, t.status]));
    expect(s).toEqual({ "CT-01": "WARNING", "CT-02": "OK", "CT-03": "OK", "CT-04": "CHECK_LIMIT" });
    const types = new Set(a.alerts.map((x) => x.type));
    for (const t of ["UNKNOWN_TRAY", "UNKNOWN_CABLE", "INVALID_OD_QTY", "UNCLASSIFIED", "DUPLICATE_ASSIGNMENT"])
      expect(types.has(t as never)).toBe(true);
  });
});

describe("duplicate vs excluded counts", () => {
  it("separates duplicates from invalid exclusions", () => {
    const a = analyze({ trays: sourceTrays, cables: sourceCables, assignments: sourceAssignments, rules: sourceRules, settings });
    const ct04 = a.trays.find((t) => t.tray.id === "CT-04")!;
    expect(ct04.duplicateCount).toBe(1);
    expect(ct04.excludedCount).toBe(0);
  });
});
