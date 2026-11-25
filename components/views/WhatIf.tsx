"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../AppState";
import { Button, Callout, Card, Field, PageHeader, StatusBadge, cx, inputCls } from "../ui";
import { CrossSection, STATUS_FILL } from "../viz";
import { CABLE_FAMILIES } from "@/lib/data";
import { fmtArea, fmtNum, fmtPct } from "@/lib/format";
import { trayHref } from "@/lib/links";
import { predictWhatIf } from "@/lib/whatif";

const PRESETS = [
  { label: "3C × 95 mm² power", od: 42, family: "LV Power" },
  { label: "3C × 50 mm² power", od: 33, family: "LV Power" },
  { label: "4C × 6 mm² power", od: 18, family: "LV Power" },
  { label: "12C × 1.5 mm² control", od: 20, family: "Control" },
  { label: "1Pr × 1.5 mm² instrument", od: 12, family: "Instrumentation" },
];

export function WhatIfView() {
  const { analysis, addScenarioCable, removeScenarioCable } = useAppState();
  const [trayId, setTrayId] = useState(analysis.trays[0]?.tray.id ?? "");
  const [tag, setTag] = useState("");
  const [od, setOd] = useState("42");
  const [qty, setQty] = useState("1");
  const [family, setFamily] = useState("LV Power");
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tray");
    // Pre-select a tray when arriving from a tray page (?tray=CT-01).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (p && analysis.trays.some((t) => t.tray.id === p)) setTrayId(p);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tray = analysis.trays.find((t) => t.tray.id === trayId);
  const odNum = od.trim() === "" ? NaN : Number(od);
  const qtyNum = qty.trim() === "" ? NaN : Number(qty);
  const result = useMemo(() => (tray ? predictWhatIf(tray, odNum, qtyNum) : null), [tray, odNum, qtyNum]);
  const scenarioCables = analysis.cables.filter((c) => c.cable.origin === "scenario");

  const reset = () => {
    setTag("");
    setOd("42");
    setQty("1");
    setFamily("LV Power");
    setAdded(null);
  };

  const verdict =
    result?.verdict === "REACHES_MAX"
      ? { tone: "crit" as const, title: "Reaches / exceeds the configured maximum", text: "Adding this cable would put the tray at or above its configured maximum threshold. Engineering review required: consider another route, a wider tray or a second tier." }
      : result?.verdict === "REACHES_WARNING"
        ? { tone: "warn" as const, title: "Reaches the warning threshold", text: "Adding this cable would reach the configured warning threshold. It is still below the configured maximum, but little spare capacity would be left." }
        : result?.verdict === "BELOW_WARNING"
          ? { tone: "info" as const, title: "Stays below the warning threshold", text: "Based on the simplified area ratio, the tray stays below the configured warning threshold." }
          : null;

  return (
    <>
      <PageHeader
        title="What-if scenario planner"
        description="Check how a proposed cable would affect a tray's estimated fill. The source data does not change unless you choose 'Add to demo scenario'."
      />

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card title="1 · Proposed cable">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-describedby="whatif-note">
            <Field label="Tray">
              <select className={inputCls} value={trayId} onChange={(e) => { setTrayId(e.target.value); setAdded(null); }}>
                {analysis.trays.map((t) => (
                  <option key={t.tray.id} value={t.tray.id}>
                    {t.tray.id} — {t.tray.role} ({fmtPct(t.fillPct)} now)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Proposed cable tag (optional)">
              <input className={inputCls} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. MCC01-M03-P01" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Outside diameter (mm)">
                <input
                  className={cx(inputCls, result && !result.valid && result.error?.includes("diameter") && "border-crit")}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  value={od}
                  onChange={(e) => { setOd(e.target.value); setAdded(null); }}
                />
              </Field>
              <Field label="Quantity (runs)">
                <input
                  className={cx(inputCls, result && !result.valid && result.error?.includes("quantity") && "border-crit")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step="1"
                  value={qty}
                  onChange={(e) => { setQty(e.target.value); setAdded(null); }}
                />
              </Field>
            </div>
            <Field label="Cable family (for rule review)">
              <select className={inputCls} value={family} onChange={(e) => setFamily(e.target.value)}>
                {CABLE_FAMILIES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
                <option value="">Not classified</option>
              </select>
            </Field>
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-2">Quick fill — typical ODs (simulated; confirm with manufacturer data)</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setOd(String(p.od)); setFamily(p.family); setAdded(null); }}
                    className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-teal hover:bg-teal-soft"
                  >
                    {p.label} · {p.od} mm
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={reset}>Reset scenario</Button>
              <Button
                variant="primary"
                disabled={!result?.valid}
                onClick={() => {
                  if (!result?.valid) return;
                  const id = addScenarioCable({ trayId, tag, od: odNum, qty: qtyNum, family });
                  setAdded(id);
                }}
              >
                + Add to demo scenario
              </Button>
            </div>
            <p id="whatif-note" className="text-xs text-ink-3">
              “Add to demo scenario” saves the cable in this browser only (marked SCENARIO) and updates every page. The JSON
              files in /data are never changed. A real cable usually passes through several trays (e.g. CT-01 then a branch):
              add it to each tray it passes through.
            </p>
            {added && (
              <Callout tone="info" title="Added to demo scenario">
                The proposed cable now counts toward {trayId}.{" "}
                <Link href={trayHref(trayId)} className="text-brand underline">View tray</Link>
              </Callout>
            )}
          </form>
        </Card>

        <div className="grid content-start gap-5">
          <Card title="2 · Predicted result" subtitle={tray ? `${tray.tray.id}: ${tray.tray.usableWidthMm} × ${tray.tray.usableHeightMm} mm, gross ${fmtArea(tray.grossAreaMm2)} · thresholds ${tray.thresholds.warningPct}% / ${tray.thresholds.maxPct}% (illustrative)` : undefined}>
            {!tray || !result ? (
              <p className="text-sm text-ink-3">Select a tray.</p>
            ) : (
              <div aria-live="polite">
                <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric label="Current fill" value={fmtPct(result.currentFillPct, 2)} sub={<StatusBadge status={tray.status} />} />
                  <Metric label="Additional area" value={result.additionalAreaMm2 === null ? "—" : `+${fmtNum(result.additionalAreaMm2, 1)}`} unit="mm²" sub={result.valid ? `π × (${odNum}/2)² × ${qtyNum}` : undefined} />
                  <Metric label="Predicted fill" value={fmtPct(result.predictedFillPct, 2)} sub={result.valid ? <StatusBadge status={result.predictedStatus} /> : undefined} emphasis />
                  <Metric
                    label="Predicted remaining"
                    value={fmtPct(result.predictedRemainingPct, 2)}
                    sub={result.predictedAreaMm2 !== null && tray.grossAreaMm2 ? `${fmtNum(tray.grossAreaMm2 - result.predictedAreaMm2)} mm² left` : undefined}
                    danger={(result.predictedRemainingPct ?? 0) < 0}
                  />
                </dl>

                <BeforeAfter
                  current={result.currentFillPct ?? 0}
                  predicted={result.predictedFillPct}
                  warn={tray.thresholds.warningPct}
                  max={tray.thresholds.maxPct}
                  currentColor={STATUS_FILL[tray.status]}
                  predictedColor={STATUS_FILL[result.predictedStatus]}
                />

                <div className="mt-4">
                  {result.valid && verdict ? (
                    <Callout tone={verdict.tone} title={verdict.title}>
                      {verdict.text}
                    </Callout>
                  ) : (
                    <Callout tone="crit" title="Cannot calculate">
                      {result.error}
                    </Callout>
                  )}
                </div>

                <p className="mt-3 text-xs text-ink-2 tabular">
                  Space before the warning threshold:{" "}
                  <strong>{result.headroomToWarningMm2 !== null && result.headroomToWarningMm2 > 0 ? `${fmtNum(result.headroomToWarningMm2)} mm²` : "none"}</strong>
                  {result.headroomToWarningMm2 !== null && result.headroomToWarningMm2 > 0 && (
                    <> (≈ one cable of OD {fmtNum(2 * Math.sqrt(result.headroomToWarningMm2 / Math.PI), 1)} mm)</>
                  )}
                  {" · "}Space before the maximum:{" "}
                  <strong>{result.headroomToMaxMm2 !== null && result.headroomToMaxMm2 > 0 ? `${fmtNum(result.headroomToMaxMm2)} mm²` : "none"}</strong>
                  {result.headroomToMaxMm2 !== null && result.headroomToMaxMm2 > 0 && (
                    <> (≈ one cable of OD {fmtNum(2 * Math.sqrt(result.headroomToMaxMm2 / Math.PI), 1)} mm)</>
                  )}
                </p>
              </div>
            )}
          </Card>

          {tray && (
            <Card title="Cross-section with proposed cable (illustrative)" subtitle="Dashed outline = proposed cable. This picture is only a guide; the result uses the area ratio.">
              <CrossSection t={tray} extra={result?.valid ? { od: odNum, qty: qtyNum } : null} />
            </Card>
          )}

          {scenarioCables.length > 0 && (
            <Card title="Cables in the demo scenario" subtitle="Saved in this browser only. Remove them here or use “Reset to source data” in the top bar.">
              <ul className="divide-y divide-line text-sm">
                {scenarioCables.map((c) => (
                  <li key={c.cable.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <strong>{c.cable.tag}</strong> · OD {c.cable.outsideDiameterMm} mm × {c.cable.quantity} · {c.cable.cableFamily || "Unclassified"} · in{" "}
                      {c.routedTrayIds.join(", ")} · {fmtArea(c.totalAreaMm2)}
                    </span>
                    <Button variant="danger" onClick={() => removeScenarioCable(c.cable.id)}>Remove</Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, unit, sub, emphasis, danger }: { label: string; value: string; unit?: string; sub?: React.ReactNode; emphasis?: boolean; danger?: boolean }) {
  return (
    <div className={cx("rounded-md border p-3", emphasis ? "border-brand/40 bg-teal-soft/40" : "border-line")}>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className={cx("mt-0.5 text-xl font-semibold tabular", danger && "text-crit")}>
        {value} {unit && <span className="text-sm font-normal text-ink-3">{unit}</span>}
      </dd>
      {sub && <dd className="mt-1 text-xs text-ink-3">{sub}</dd>}
    </div>
  );
}

function BeforeAfter({ current, predicted, warn, max, currentColor, predictedColor }: { current: number; predicted: number | null; warn: number; max: number; currentColor: string; predictedColor: string }) {
  const scale = Math.max(100, Math.ceil(((predicted ?? current) + 5) / 10) * 10);
  const p = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const rows = [
    { label: "Current", v: current, color: currentColor },
    ...(predicted !== null ? [{ label: "Predicted", v: predicted, color: predictedColor }] : []),
  ];
  return (
    <div className="mt-5" role="img" aria-label={`Current fill ${current.toFixed(1)}%, predicted ${predicted?.toFixed(1) ?? "n/a"}%, warning ${warn}%, maximum ${max}%`}>
      <div className="relative">
        {rows.map((r) => (
          <div key={r.label} className="mb-2 grid grid-cols-[72px_1fr] items-center gap-2">
            <span className="text-xs text-ink-2">{r.label}</span>
            <div className="relative h-5 rounded-sm bg-canvas ring-1 ring-inset ring-line">
              <div className="absolute inset-y-0 left-0 rounded-r-[4px] transition-all duration-300" style={{ width: p(r.v), background: r.color }} />
              <span className="absolute top-0 pl-1.5 text-xs font-semibold leading-5 tabular" style={{ left: p(r.v) }}>{r.v.toFixed(1)}%</span>
              <span className="absolute -inset-y-1 w-0.5 bg-warn" style={{ left: p(warn) }} />
              <span className="absolute -inset-y-1 w-0.5 bg-crit" style={{ left: p(max) }} />
            </div>
          </div>
        ))}
        <div className="relative ml-[80px] h-4 text-[10px] tabular text-ink-3">
          <span className="absolute left-0">0%</span>
          <span className="absolute -translate-x-1/2 text-warn" style={{ left: p(warn) }}>W {warn}%</span>
          <span className="absolute -translate-x-1/2 text-crit" style={{ left: p(max) }}>M {max}%</span>
          <span className="absolute right-0">{scale}%</span>
        </div>
      </div>
    </div>
  );
}
