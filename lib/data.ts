// Loads the local SIMULATED dataset. Replace the JSON files in /data to use your own data
// (see README "Replacing the dummy data").
import projectJson from "@/data/project.json";
import traysJson from "@/data/trays.json";
import cablesJson from "@/data/cables.json";
import assignmentsJson from "@/data/route-assignments.json";
import rulesJson from "@/data/demo-rules.json";
import layoutJson from "@/public/model/practice-layout.json";
import type { Cable, DemoRule, Project, RouteAssignment, Tray } from "./types";

export const project = projectJson as Project;
export const sourceTrays = traysJson as unknown as Tray[];
export const sourceCables = (cablesJson as unknown as Cable[]).map((c) => ({ ...c, origin: "source" as const }));
export const sourceAssignments = (assignmentsJson as unknown as RouteAssignment[]).map((a) => ({
  ...a,
  origin: "source" as const,
}));
export const sourceRules = rulesJson as unknown as DemoRule[];

export interface LayoutTray {
  trayId: string;
  points: [number, number][];
  widthMm: number;
  labelAt: [number, number];
}
export interface LayoutEquipment {
  id: string;
  kind: "mcc" | "jb" | "motor";
  label: string;
  subLabel: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  cx?: number;
  cy?: number;
  r?: number;
  connectTo: [number, number];
}
export interface Layout {
  description: string;
  units: string;
  trays: LayoutTray[];
  equipment: LayoutEquipment[];
}
export const layout = layoutJson as unknown as Layout;

/** Families used in the demo, in fixed categorical-colour order. */
export const CABLE_FAMILIES = ["LV Power", "Control", "Instrumentation", "Communication", "Earthing"] as const;
