"use client";

import { useEffect, useState } from "react";
import { useAppState } from "../AppState";
import { Button, Card, PageHeader, StatusBadge } from "../ui";
import { TrayLayout } from "../viz";
import { LimitationsList } from "./Limitations";
import { project } from "@/lib/data";
import { fmtNum, fmtPct } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { cableScheduleCsv, routeAssignmentsCsv, stamp, trayAnalysisCsv } from "@/lib/exports";

export function ReportsView() {
  const { analysis, settings } = useAppState();
  const [generated, setGenerated] = useState("");
  useEffect(() => {
    // Timestamp set on the client so the printed report shows when it was generated.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGenerated(new Date().toLocaleString());
  }, []);

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Reports & exports"
          description="Download CSV files or print the report below (use your browser's “Save as PDF” option to make a PDF). Every export is labelled SIMULATED DATA and includes units."
        />
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <ExportTile title="Tray analysis" desc="Dimensions, areas, fill, remaining, thresholds, status." onClick={() => downloadCsv(`tray-analysis_${stamp()}.csv`, trayAnalysisCsv(analysis.trays, settings))} />
          <ExportTile title="Cable schedule" desc="OD, quantity, areas, routed trays, data issues." onClick={() => downloadCsv(`cable-schedule_${stamp()}.csv`, cableScheduleCsv(analysis.cables, settings))} />
          <ExportTile title="Route assignments" desc="Every assignment with its validation status." onClick={() => downloadCsv(`route-assignments_${stamp()}.csv`, routeAssignmentsCsv(analysis.assignments, settings))} />
          <div className="flex flex-col justify-between rounded-lg border border-brand/30 bg-teal-soft/40 p-4">
            <div>
              <p className="text-sm font-semibold">Printable report</p>
              <p className="mt-1 text-xs text-ink-2">A4 layout with the SIMULATED DATA label and a generated timestamp.</p>
            </div>
            <Button variant="primary" className="mt-3" onClick={() => window.print()}>⎙ Print / Save as PDF</Button>
          </div>
        </div>
        <p className="mb-3 text-xs text-ink-3">To export a filtered list, use the Export buttons on the Trays, Cables and Routes pages; those files follow the active filters.</p>
      </div>

      {/* ---------- Printable report ---------- */}
      <article className="relative rounded-lg border border-line bg-surface p-6 sm:p-8 print:border-0 print:p-0" aria-label="Printable tray-fill report">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden items-center justify-center overflow-hidden print:flex">
          <span className="-rotate-30 select-none text-[96px] font-black tracking-widest text-crit/10">SIMULATED DATA</span>
        </div>

        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-navy pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal">Smart Cable Guardian 360 · Tray-fill estimate report</p>
            <h2 className="mt-1 text-xl font-semibold text-navy">{project.name}</h2>
            <p className="text-sm text-ink-2">Revision {project.revision} · {project.modelName}</p>
          </div>
          <div className="text-right text-xs text-ink-2">
            <p className="inline-block rounded bg-crit px-2 py-1 font-bold uppercase tracking-wider text-white">Simulated data</p>
            <p className="mt-2">Generated: {generated || "—"}</p>
            <p>Data updated: {project.updatedAt}</p>
            <p>Units: {project.units}</p>
          </div>
        </header>

        <Section title="1. Project metadata">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Row k="Project ID" v={project.id} />
            <Row k="Data source" v={project.dataSource} />
            <Row k="Trays / cable records" v={`${analysis.kpis.trayCount} / ${analysis.kpis.cableRecordCount} (${analysis.kpis.cablePieceCount} pieces)`} />
            <Row k="Trusted route assignments" v={`${analysis.kpis.trustedAssignmentCount} of ${analysis.assignments.length}`} />
          </dl>
        </Section>

        <Section title="2. Calculation method (V1 simplified)">
          <pre className="overflow-x-auto rounded-md bg-canvas p-3 font-mono text-xs leading-relaxed text-ink">
{`Cable area (mm²)        = π × (OD / 2)²
Cable record area (mm²) = cable area × quantity
Gross tray area (mm²)   = usable width × usable height
Estimated fill (%)      = Σ assigned cable areas / gross tray area × 100
Estimated remaining (%) = 100 − fill   (shown negative if fill > 100%, never clamped)`}
          </pre>
          <p className="mt-2 text-xs text-ink-2">
            A cable is counted once in every tray it passes through, and never twice in the same tray. Records with an unknown
            tray or cable, an invalid OD or an invalid quantity are left out of the calculation and listed under alerts.
          </p>
        </Section>

        <Section title="3. Threshold settings (user-configured, illustrative)">
          <p className="text-sm text-ink-2">
            {settings.mode === "global"
              ? `Global override: warning ${settings.global.warningPct}%, maximum ${settings.global.maxPct}% applied to all trays.`
              : "Per-tray thresholds from trays.json (listed in the table below)."}{" "}
            These are not a universal tray-fill standard. Confirm them against the project specification and the applicable code.
          </p>
        </Section>

        <Section title="4. Tray-wise results">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy text-left text-xs text-white">
                  {["Tray", "Role", "W×H (mm)", "Gross (mm²)", "Cable (mm²)", "Fill (%)", "Remaining (%)", "W / M (%)", "Status"].map((h) => (
                    <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.trays.map((t) => (
                  <tr key={t.tray.id} className="border-b border-line">
                    <td className="px-2 py-1.5 font-semibold">{t.tray.id}</td>
                    <td className="px-2 py-1.5">{t.tray.role}</td>
                    <td className="px-2 py-1.5 tabular">{t.tray.usableWidthMm}×{t.tray.usableHeightMm}</td>
                    <td className="px-2 py-1.5 text-right tabular">{fmtNum(t.grossAreaMm2)}</td>
                    <td className="px-2 py-1.5 text-right tabular">{fmtNum(t.cableAreaMm2, 1)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular">{fmtPct(t.fillPct, 2)}</td>
                    <td className="px-2 py-1.5 text-right tabular">{fmtPct(t.remainingPct, 2)}</td>
                    <td className="px-2 py-1.5 tabular">{t.thresholds.warningPct} / {t.thresholds.maxPct}</td>
                    <td className="px-2 py-1.5"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 max-w-2xl print-avoid">
            <TrayLayout trays={analysis.trays} />
          </div>
        </Section>

        <Section title={`5. Alerts (${analysis.alerts.length})`} breakBefore>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {analysis.alerts.map((a) => (
              <li key={a.id}>
                <span className="font-semibold uppercase text-xs">[{a.severity}]</span> {a.message} <span className="text-ink-3">({a.title})</span>
                <div className="text-xs text-ink-2">Why: {a.reason}</div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="6. Rule review (illustrative)">
          <ul className="space-y-1 text-sm">
            {analysis.rules.map((r) => (
              <li key={r.rule.id}>
                <strong>{r.rule.id} {r.rule.name}</strong>: {r.outcome.replace("_", " ").toLowerCase()} ·{" "}
                {r.configured ? `project requirement: ${r.rule.projectRequirement}` : "Rule not configured — manual engineering review required"}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="7. Engineering limitations">
          <LimitationsList />
        </Section>

        <footer className="mt-6 border-t border-line pt-3 text-xs text-ink-3">
          SIMULATED DATA · Educational prototype · Not a live SP3D integration · Not a certified calculation · Generated {generated}
        </footer>
      </article>
    </>
  );
}

function ExportTile({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <Card className="flex flex-col">
      <p className="text-sm font-semibold">{title} <span className="text-xs font-normal text-ink-3">(CSV)</span></p>
      <p className="mt-1 text-xs text-ink-2">{desc}</p>
      <Button className="mt-3 w-full" onClick={onClick}>⭳ Download CSV</Button>
    </Card>
  );
}

function Section({ title, children, breakBefore }: { title: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <section className={"mt-6 " + (breakBefore ? "print-break" : "")}>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy">{title}</h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 border-b border-line/60 py-1">
      <dt className="w-44 shrink-0 text-ink-3">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
