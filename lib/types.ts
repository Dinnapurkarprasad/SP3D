// Core data schema for Smart Cable Guardian 360.
// Raw records are loaded from /data/*.json. Numeric fields are typed as `unknown`-tolerant
// at runtime: validation (lib/validate.ts) never trusts that JSON values are numbers.

export interface Project {
  id: string;
  name: string;
  revision: string;
  modelName: string;
  dataSource: string;
  units: string;
  updatedAt: string;
}

export interface Tray {
  id: string;
  role: string;
  area: string;
  level: string;
  trayType: string;
  usableWidthMm: number;
  usableHeightMm: number;
  /** Practice length (informational only — not used in fill calculation). */
  lengthMm?: number;
  warningThresholdPct: number;
  maxThresholdPct: number;
}

export interface Cable {
  id: string;
  tag: string;
  fromEquipment: string;
  toEquipment: string;
  cableType: string;
  cableFamily: string;
  outsideDiameterMm: number;
  quantity: number;
  description: string;
  /** "source" = loaded from /data, "scenario" = added via What-if "Add to demo scenario". */
  origin?: "source" | "scenario";
}

export interface RouteAssignment {
  id: string;
  cableId: string;
  trayId: string;
  segmentName: string;
  sequence: number;
  notes: string;
  origin?: "source" | "scenario";
}

export type RuleCheck = "co-location" | "classification" | "not-evaluable";

export interface DemoRule {
  id: string;
  name: string;
  check: RuleCheck;
  cableFamilies: string[];
  ruleDescription: string;
  severity: "high" | "medium" | "low";
  sourceLabel: string;
  /** Approved project requirement text. null => "Rule not configured — manual engineering review required". */
  projectRequirement: string | null;
  isIllustrative: boolean;
  enabled?: boolean;
}

export type FillStatus = "OK" | "WARNING" | "CHECK_LIMIT" | "DATA_ISSUE";

export interface Thresholds {
  warningPct: number;
  maxPct: number;
}

export interface ThresholdSettings {
  /** "tray" = use each tray's own thresholds from trays.json; "global" = override all trays. */
  mode: "tray" | "global";
  global: Thresholds;
}

export type AssignmentStatus =
  | "VALID"
  | "UNKNOWN_TRAY"
  | "UNKNOWN_CABLE"
  | "INVALID_CABLE_DATA"
  | "DUPLICATE";

export interface AssignmentResult {
  assignment: RouteAssignment;
  status: AssignmentStatus;
  /** True only when the record is included in trusted fill calculations. */
  trusted: boolean;
  reason: string;
}

export interface CableIssue {
  field: "outsideDiameterMm" | "quantity" | "cableFamily";
  message: string;
}

export interface CableResult {
  cable: Cable;
  valid: boolean;
  issues: CableIssue[];
  unitAreaMm2: number | null;
  totalAreaMm2: number | null;
  /** Trays this cable is validly routed through, in sequence order. */
  routedTrayIds: string[];
}

export interface TrayCableLine {
  cable: Cable;
  unitAreaMm2: number;
  totalAreaMm2: number;
  assignmentId: string;
}

export interface TrayResult {
  tray: Tray;
  validDimensions: boolean;
  thresholds: Thresholds;
  thresholdsValid: boolean;
  grossAreaMm2: number | null;
  cableAreaMm2: number;
  fillPct: number | null;
  remainingPct: number | null;
  remainingAreaMm2: number | null;
  status: FillStatus;
  statusReason: string;
  lines: TrayCableLine[];
  /** Assignments pointing at this tray excluded because the cable data is invalid/missing (fill may be understated). */
  excludedCount: number;
  /** Duplicate assignments ignored (cable already counted once in this tray — no understatement). */
  duplicateCount: number;
  areaByFamily: Record<string, number>;
}

export type AlertType =
  | "NEAR_THRESHOLD"
  | "AT_MAX"
  | "UNKNOWN_TRAY"
  | "UNKNOWN_CABLE"
  | "INVALID_OD_QTY"
  | "UNCLASSIFIED"
  | "DUPLICATE_ASSIGNMENT"
  | "INVALID_TRAY";

export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertLink {
  label: string;
  href: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  category: "Capacity" | "Data quality";
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Why the alert appeared — shown in the UI. */
  reason: string;
  links: AlertLink[];
}

export interface RuleResult {
  rule: DemoRule;
  evaluable: boolean;
  configured: boolean;
  outcome: "FLAGGED" | "NOT_FLAGGED" | "CANNOT_EVALUATE" | "DISABLED";
  findings: { text: string; href?: string }[];
  explanation: string;
}

export interface Kpis {
  trayCount: number;
  cableRecordCount: number;
  cablePieceCount: number;
  trustedAssignmentCount: number;
  highestFill: { trayId: string; fillPct: number } | null;
  averageFillPct: number | null;
  warningCount: number;
  checkLimitCount: number;
  dataIssueAlertCount: number;
  capacityAlertCount: number;
}

export interface Analysis {
  trays: TrayResult[];
  cables: CableResult[];
  assignments: AssignmentResult[];
  alerts: Alert[];
  rules: RuleResult[];
  kpis: Kpis;
}
