// Transparent, illustrative rule review. This is NOT automated code compliance.
import type { CableResult, DemoRule, RuleResult, TrayResult } from "./types";
import { cableHref, trayHref } from "./links";

export const RULE_NOT_CONFIGURED = "Rule not configured — manual engineering review required";

export function evaluateRules(rules: DemoRule[], trays: TrayResult[], cables: CableResult[]): RuleResult[] {
  return rules.map((rule): RuleResult => {
    const configured = !!rule.projectRequirement && rule.projectRequirement.trim() !== "";
    if (rule.enabled === false) {
      return {
        rule,
        evaluable: false,
        configured,
        outcome: "DISABLED",
        findings: [],
        explanation: "Rule disabled by the user on this device.",
      };
    }

    if (rule.check === "co-location") {
      const families = rule.cableFamilies;
      const findings: RuleResult["findings"] = [];
      for (const t of trays) {
        const present = families.filter((f) => t.lines.some((l) => l.cable.cableFamily === f));
        if (families.length > 1 && present.length === families.length) {
          const tags = t.lines
            .filter((l) => families.includes(l.cable.cableFamily))
            .map((l) => `${l.cable.tag} (${l.cable.cableFamily})`)
            .join(", ");
          findings.push({ text: `${t.tray.id}: ${families.join(" + ")} share this tray — ${tags}`, href: trayHref(t.tray.id) });
        }
      }
      const unclassified = cables.filter((c) => !c.cable.cableFamily?.trim()).length;
      return {
        rule,
        evaluable: true,
        configured,
        outcome: findings.length ? "FLAGGED" : "NOT_FLAGGED",
        findings,
        explanation:
          `The app can check which cable families share a tray, using route assignments.` +
          (unclassified ? ` ${unclassified} unclassified cable(s) could not be included.` : "") +
          ` It cannot say whether sharing is allowed: that needs the approved project requirement.`,
      };
    }

    if (rule.check === "classification") {
      const missing = cables.filter((c) => !c.cable.cableFamily?.trim());
      return {
        rule,
        evaluable: true,
        configured,
        outcome: missing.length ? "FLAGGED" : "NOT_FLAGGED",
        findings: missing.map((c) => ({ text: `${c.cable.tag}: cable family missing`, href: cableHref(c.cable.id) })),
        explanation: "The app checks that every cable record has a cableFamily value.",
      };
    }

    return {
      rule,
      evaluable: false,
      configured,
      outcome: "CANNOT_EVALUATE",
      findings: [],
      explanation:
        "The data has no cable positions inside the tray and no approved distance value, so this rule cannot be checked automatically. The app does not invent separation distances.",
    };
  });
}
