"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { analyze } from "@/lib/analysis";
import { sourceAssignments, sourceCables, sourceRules, sourceTrays } from "@/lib/data";
import type { Analysis, Cable, DemoRule, RouteAssignment, ThresholdSettings } from "@/lib/types";

const STORAGE_KEY = "scg360:v1";

interface RuleOverride {
  enabled?: boolean;
  projectRequirement?: string | null;
}

interface Persisted {
  settings: ThresholdSettings;
  scenarioCables: Cable[];
  scenarioAssignments: RouteAssignment[];
  ruleOverrides: Record<string, RuleOverride>;
}

const DEFAULTS: Persisted = {
  settings: { mode: "tray", global: { warningPct: 30, maxPct: 40 } },
  scenarioCables: [],
  scenarioAssignments: [],
  ruleOverrides: {},
};

interface AppStateValue extends Persisted {
  analysis: Analysis;
  rules: DemoRule[];
  setSettings: (s: ThresholdSettings) => void;
  addScenarioCable: (input: { trayId: string; tag: string; od: number; qty: number; family: string }) => string;
  removeScenarioCable: (cableId: string) => void;
  setRuleOverride: (ruleId: string, o: RuleOverride) => void;
  resetAll: () => void;
  hasLocalChanges: boolean;
}

const Ctx = createContext<AppStateValue | null>(null);

function load(): Persisted {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      settings: p.settings ?? DEFAULTS.settings,
      scenarioCables: Array.isArray(p.scenarioCables) ? p.scenarioCables : [],
      scenarioAssignments: Array.isArray(p.scenarioAssignments) ? p.scenarioAssignments : [],
      ruleOverrides: p.ruleOverrides ?? {},
    };
  } catch {
    return DEFAULTS;
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate from browser storage after mount (avoids server/client mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — state stays in memory */
    }
  }, [state, hydrated]);

  const rules = useMemo<DemoRule[]>(
    () => sourceRules.map((r) => ({ ...r, ...state.ruleOverrides[r.id] })),
    [state.ruleOverrides],
  );

  const analysis = useMemo(
    () =>
      analyze({
        trays: sourceTrays,
        cables: [...sourceCables, ...state.scenarioCables],
        assignments: [...sourceAssignments, ...state.scenarioAssignments],
        rules,
        settings: state.settings,
      }),
    [state.scenarioCables, state.scenarioAssignments, state.settings, rules],
  );

  const setSettings = useCallback((settings: ThresholdSettings) => setState((s) => ({ ...s, settings })), []);

  const addScenarioCable = useCallback<AppStateValue["addScenarioCable"]>((input) => {
    const id = `SCN-${Date.now().toString(36).toUpperCase()}`;
    const cable: Cable = {
      id,
      tag: input.tag.trim() || id,
      fromEquipment: "Proposed",
      toEquipment: "Proposed",
      cableType: `Proposed cable, OD ${input.od} mm`,
      cableFamily: input.family,
      outsideDiameterMm: input.od,
      quantity: input.qty,
      description: "Added from What-if planner (demo scenario only)",
      origin: "scenario",
    };
    const assignment: RouteAssignment = {
      id: `RA-${id}`,
      cableId: id,
      trayId: input.trayId,
      segmentName: `${input.trayId} (scenario)`,
      sequence: 1,
      notes: "Scenario assignment — stored in this browser only",
      origin: "scenario",
    };
    setState((s) => ({
      ...s,
      scenarioCables: [...s.scenarioCables, cable],
      scenarioAssignments: [...s.scenarioAssignments, assignment],
    }));
    return id;
  }, []);

  const removeScenarioCable = useCallback((cableId: string) => {
    setState((s) => ({
      ...s,
      scenarioCables: s.scenarioCables.filter((c) => c.id !== cableId),
      scenarioAssignments: s.scenarioAssignments.filter((a) => a.cableId !== cableId),
    }));
  }, []);

  const setRuleOverride = useCallback((ruleId: string, o: RuleOverride) => {
    setState((s) => ({ ...s, ruleOverrides: { ...s.ruleOverrides, [ruleId]: { ...s.ruleOverrides[ruleId], ...o } } }));
  }, []);

  const resetAll = useCallback(() => setState(DEFAULTS), []);

  const hasLocalChanges =
    state.scenarioCables.length > 0 ||
    Object.keys(state.ruleOverrides).length > 0 ||
    JSON.stringify(state.settings) !== JSON.stringify(DEFAULTS.settings);

  const value: AppStateValue = {
    ...state,
    analysis,
    rules,
    setSettings,
    addScenarioCable,
    removeScenarioCable,
    setRuleOverride,
    resetAll,
    hasLocalChanges,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}
