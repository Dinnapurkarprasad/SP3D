"use client";

import Link from "next/link";
import { useAppState } from "../AppState";
import { Card, KpiCard, PageHeader, SeverityBadge, StatusBadge } from "../ui";
import { FamilyStackChart, FillBar, FillChart, TrayLayout } from "../viz";
import { fmtArea, fmtNum, fmtPct } from "@/lib/format";
import { trayHref } from "@/lib/links";
import { LimitationsList } from "./Limitations";

export function OverviewView() {
  const { analysis, settings } = useAppState();
  const { kpis, trays, alerts } = analysis;

  return (
    <>
      <PageHeader
        title="Overview dashboard"
        description="Estimated cable-tray occupancy for the simulated practice layout, calculated from cable outside diameter and quantity using a simple area ratio."
        actions={
          <Link href="/what-if" className="rounded-md border border-brand bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-navy">
            Test a proposed cable →
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Trays analysed" value={kpis.trayCount} unit="trays" hint="Practice layout CT-01 to CT-04" href="/trays" />
        <KpiCard
          label="Cable records"
          value={kpis.cableRecordCount}
          unit="records"
          hint={`${fmtNum(kpis.cablePieceCount)} cable pieces in total`}
          href="/cables"
        />
        <KpiCard
          label="Highest estimated fill"
          value={kpis.highestFill ? kpis.highestFill.fillPct.toFixed(1) : "—"}
          unit="%"
          hint={kpis.highestFill ? `Tray ${kpis.highestFill.trayId}` : undefined}
          tone={kpis.checkLimitCount ? "crit" : kpis.warningCount ? "warn" : "ok"}
          href={kpis.highestFill ? trayHref(kpis.highestFill.trayId) : undefined}
        />
        <KpiCard label="Average estimated fill" value={kpis.averageFillPct?.toFixed(1) ?? "—"} unit="%" hint="Mean across valid trays" />
        <KpiCard
          label="Trays at WARNING / CHECK LIMIT"
          value={`${kpis.warningCount} / ${kpis.checkLimitCount}`}
          unit="trays"
          tone={kpis.checkLimitCount ? "crit" : kpis.warningCount ? "warn" : "ok"}
          hint={settings.mode === "global" ? `Global ${settings.global.warningPct}% / ${settings.global.maxPct}%` : "Per-tray thresholds"}
          href="/alerts"
        />
        <KpiCard
          label="Data-quality alerts"
          value={kpis.dataIssueAlertCount}
          unit="alerts"
          tone={kpis.dataIssueAlertCount ? "crit" : "ok"}
          hint="Invalid or excluded records"
          href="/alerts"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card
          title="Practice tray layout — plan view"
          subtitle="Simulated SP3D-style model: CT-01 main tray from MCC-01, branches CT-02, CT-03 and CT-04."
        >
          <TrayLayout trays={trays} />
        </Card>
        <div className="grid gap-5">
          <Card title="Estimated fill by tray" subtitle="Hover or focus a bar for details; click to open the tray.">
            <FillChart trays={trays} />
          </Card>
          <Card title="Cable area by family" subtitle="Which cable families take up each tray's area.">
            <FamilyStackChart trays={trays} />
          </Card>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Tray register summary" actions={<Link href="/trays" className="text-sm text-brand hover:underline">All trays →</Link>}>
          <ul className="divide-y divide-line">
            {trays.map((t) => (
              <li key={t.tray.id} className="py-3 first:pt-0 last:pb-0">
                <Link href={trayHref(t.tray.id)} className="block rounded hover:bg-canvas">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">
                      <strong>{t.tray.id}</strong> <span className="text-ink-3">· {t.tray.role} · {t.tray.usableWidthMm}×{t.tray.usableHeightMm} mm</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular">{fmtPct(t.fillPct)}</span>
                      <StatusBadge status={t.status} />
                    </span>
                  </div>
                  <FillBar t={t} />
                  <p className="mt-1 text-xs text-ink-3 tabular">
                    {fmtArea(t.cableAreaMm2)} of {fmtArea(t.grossAreaMm2)} · remaining {fmtPct(t.remainingPct)}
                    {t.excludedCount > 0 && <span className="text-crit"> · {t.excludedCount} record(s) excluded — fill may be understated</span>}
                    {t.duplicateCount > 0 && <span className="text-warn"> · {t.duplicateCount} duplicate route record(s) ignored</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Latest alerts"
          subtitle="Every alert explains why it appeared and links to the record."
          actions={<Link href="/alerts" className="text-sm text-brand hover:underline">Alert centre →</Link>}
        >
          <ul className="divide-y divide-line">
            {alerts.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-2.5 first:pt-0">
                <SeverityBadge severity={a.severity} />
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-ink-2">{a.reason}</p>
                  <p className="mt-0.5 flex flex-wrap gap-3 text-xs">
                    {a.links.map((l) => (
                      <Link key={l.href} href={l.href} className="text-brand hover:underline">
                        {l.label}
                      </Link>
                    ))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Engineering limitations" className="mt-5">
        <LimitationsList compact />
      </Card>
    </>
  );
}
