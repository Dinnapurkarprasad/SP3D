"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppState } from "../AppState";
import { Button, Callout, Card, PageHeader, cx, inputCls } from "../ui";
import { RULE_NOT_CONFIGURED } from "@/lib/rules";
import type { RuleResult } from "@/lib/types";

const OUTCOME: Record<RuleResult["outcome"], { label: string; cls: string }> = {
  FLAGGED: { label: "Flagged for review", cls: "bg-warn-bg text-warn" },
  NOT_FLAGGED: { label: "Nothing flagged", cls: "bg-ok-bg text-ok" },
  CANNOT_EVALUATE: { label: "Cannot evaluate", cls: "bg-issue-bg text-issue" },
  DISABLED: { label: "Disabled", cls: "bg-canvas text-ink-3" },
};

export function RulesView() {
  const { analysis } = useAppState();
  return (
    <>
      <PageHeader
        title="Segregation / rule review"
        description="A transparent checklist of illustrative demo rules loaded from data/demo-rules.json. It is not an automated code-compliance check."
      />
      <Callout tone="warn" title="Illustrative rules only">
        These rules are examples for learning. They do not include mandatory separation distances, and none are invented
        here. Rules without approved project requirement text show “{RULE_NOT_CONFIGURED}”. You can enable or disable rules and
        enter project requirement text below; edits are saved in this browser only.
      </Callout>
      <div className="mt-5 space-y-4">
        {analysis.rules.map((r) => (
          <RuleCard key={r.rule.id} r={r} />
        ))}
      </div>
    </>
  );
}

function RuleCard({ r }: { r: RuleResult }) {
  const { setRuleOverride } = useAppState();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(r.rule.projectRequirement ?? "");
  const o = OUTCOME[r.outcome];

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-ink-3">{r.rule.id}</span> {r.rule.name}
          {r.rule.isIllustrative && <span className="rounded border border-dashed border-teal/60 bg-teal-soft px-1.5 text-[10px] font-bold uppercase text-teal">Illustrative</span>}
        </span>
      }
      subtitle={r.rule.sourceLabel}
      actions={
        <>
          <span className={cx("rounded px-2 py-0.5 text-xs font-semibold", o.cls)}>{o.label}</span>
          <label className="flex items-center gap-1.5 text-xs text-ink-2">
            <input type="checkbox" checked={r.rule.enabled !== false} onChange={(e) => setRuleOverride(r.rule.id, { enabled: e.target.checked })} />
            Enabled
          </label>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 text-sm">
          <p className="text-ink-2">{r.rule.ruleDescription}</p>
          <p className="text-xs text-ink-3">
            Severity: <strong className="uppercase">{r.rule.severity}</strong> · Families:{" "}
            {r.rule.cableFamilies.length ? r.rule.cableFamilies.join(", ") : "all cables"}
          </p>
        </div>
        <div className="text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-3">Can the app evaluate it?</h3>
          <p className={cx("mt-1 font-medium", r.evaluable ? "text-ok" : "text-issue")}>{r.evaluable ? "Yes, from the data available" : "No"}</p>
          <p className="mt-1 text-xs text-ink-2">{r.explanation}</p>
          <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-3">What it flagged</h3>
          {r.findings.length ? (
            <ul className="mt-1 space-y-1 text-xs">
              {r.findings.map((f) => (
                <li key={f.text}>
                  {f.href ? <Link href={f.href} className="text-brand hover:underline">{f.text}</Link> : f.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-ink-3">{r.outcome === "NOT_FLAGGED" ? "Nothing flagged." : "—"}</p>
          )}
        </div>
        <div className="text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-3">Project rule needing confirmation</h3>
          {editing ? (
            <div className="mt-1 space-y-2">
              <textarea
                className={inputCls}
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the requirement from the approved project specification (with document number and revision)."
                aria-label={`Project requirement for ${r.rule.id}`}
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setRuleOverride(r.rule.id, { projectRequirement: text.trim() || null });
                    setEditing(false);
                  }}
                >
                  Save
                </Button>
                <Button onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              {r.configured ? (
                <p className="mt-1 rounded-md bg-canvas p-2 text-xs text-ink-2">{r.rule.projectRequirement}</p>
              ) : (
                <p className="mt-1 rounded-md border border-issue/30 bg-issue-bg p-2 text-xs font-semibold text-issue">{RULE_NOT_CONFIGURED}</p>
              )}
              <Button variant="ghost" className="mt-2 px-0" onClick={() => setEditing(true)}>
                ✎ Edit requirement text
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
