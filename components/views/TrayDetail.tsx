"use client";

import Link from "next/link";
import { useAppState } from "../AppState";
import { Callout, Card, EmptyState, KpiCard, PageHeader, StatusBadge } from "../ui";
import { CrossSection, FamilyLegend, FillBar, TrayLayout, familyColor, familyLabel } from "../viz";
import { TableWrap, Th, tdCls, tdNum } from "../table";
import { fmtArea, fmtNum, fmtPct } from "@/lib/format";
import { cableHref, routeHref } from "@/lib/links";

export function TrayDetailView({ id }: { id: string }) {
  const { analysis } = useAppState();
  const t = analysis.trays.find((x) => x.tray.id === id);

  if (!t) {
    return (
      <>
        <PageHeader title={`Tray ${id}`} />
        <EmptyState>
          Tray “{id}” is not in the tray register. <Link href="/trays" className="text-brand underline">Back to trays</Link>
        </EmptyState>
      </>
    );
  }

  const excluded = analysis.assignments.filter((a) => a.assignment.trayId === id && !a.trusted);
  const families = Object.keys(t.areaByFamily);

  return (
    <>
      <nav aria-label="Breadcrumb" className="no-print mb-2 text-xs text-ink-3">
        <Link href="/trays" className="hover:text-brand">Trays</Link> / {t.tray.id}
      </nav>
      <PageHeader
        title={`${t.tray.id} — ${t.tray.role}`}
        description={`${t.tray.area} · ${t.tray.level} · ${t.tray.trayType}`}
        actions={
          <Link href={`/what-if?tray=${encodeURIComponent(t.tray.id)}`} className="rounded-md border border-brand bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-navy">
            What-if on {t.tray.id} →
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Usable width × side height" value={`${t.tray.usableWidthMm} × ${t.tray.usableHeightMm}`} unit="mm" hint={t.tray.lengthMm ? `Practice length ${fmtNum(t.tray.lengthMm)} mm` : undefined} />
        <KpiCard label="Gross tray area" value={fmtNum(t.grossAreaMm2)} unit="mm²" hint="width × height" />
        <KpiCard label="Assigned cable area" value={fmtNum(t.cableAreaMm2)} unit="mm²" hint={`${t.lines.length} trusted assignment(s)`} />
        <KpiCard
          label="Estimated fill"
          value={t.fillPct === null ? "—" : t.fillPct.toFixed(1)}
          unit="%"
          tone={t.status === "CHECK_LIMIT" ? "crit" : t.status === "WARNING" ? "warn" : t.status === "OK" ? "ok" : "crit"}
          hint={<StatusBadge status={t.status} />}
        />
        <KpiCard
          label="Estimated remaining"
          value={t.remainingPct === null ? "—" : t.remainingPct.toFixed(1)}
          unit="%"
          hint={`${fmtArea(t.remainingAreaMm2)} of gross area`}
          tone={(t.remainingPct ?? 0) < 0 ? "crit" : "neutral"}
        />
        <KpiCard label="Thresholds (warning / max)" value={`${t.thresholds.warningPct} / ${t.thresholds.maxPct}`} unit="%" hint="User-configured, illustrative" />
      </div>

      <Card className="mt-5" title="Fill against configured thresholds" subtitle={t.statusReason}>
        <FillBar t={t} showLabels height={14} />
        <p className="mt-3 rounded-md bg-canvas px-3 py-2 font-mono text-xs text-ink-2">
          fill = Σ cable area / gross area × 100 = {fmtNum(t.cableAreaMm2, 1)} / {fmtNum(t.grossAreaMm2)} × 100 = {fmtPct(t.fillPct, 2)}
          {"  "}→ remaining = 100 − fill = {fmtPct(t.remainingPct, 2)}
        </p>
        {excluded.length > 0 && (
          <div className="mt-3">
            <Callout tone={t.excludedCount > 0 ? "crit" : "warn"} title={`${excluded.length} assignment record(s) not counted in this tray`}>
              <ul className="list-disc pl-5">
                {excluded.map((a) => (
                  <li key={a.assignment.id}>
                    <Link href={routeHref(a.assignment.id)} className="text-brand underline">{a.assignment.id}</Link> ({a.assignment.cableId}): {a.reason}
                  </li>
                ))}
              </ul>
              {t.excludedCount > 0 ? (
                <p className="mt-1">Cable data is missing or invalid for some records, so the true fill may be higher than shown until they are corrected.</p>
              ) : (
                <p className="mt-1">Duplicates are counted only once, so the fill shown is correct. Remove the duplicate route record to clean up the data.</p>
              )}
            </Callout>
          </div>
        )}
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Cable assignments in this tray" subtitle="Only trusted assignments are listed; each cable is counted once per tray segment.">
          {t.lines.length === 0 ? (
            <EmptyState>No valid cables are assigned to this tray.</EmptyState>
          ) : (
            <TableWrap caption={`Cables assigned to ${t.tray.id}`}>
              <thead>
                <tr>
                  <Th label="Cable tag" />
                  <Th label="From → To" />
                  <Th label="Family" />
                  <Th label="OD (mm)" align="right" />
                  <Th label="Qty" align="right" />
                  <Th label="Area each (mm²)" align="right" />
                  <Th label="Total (mm²)" align="right" />
                  <Th label="Share of fill" align="right" />
                </tr>
              </thead>
              <tbody>
                {[...t.lines].sort((a, b) => b.totalAreaMm2 - a.totalAreaMm2).map((l) => (
                  <tr key={l.assignmentId} className="hover:bg-canvas">
                    <td className={tdCls}>
                      <Link href={cableHref(l.cable.id)} className="whitespace-nowrap font-medium text-brand hover:underline">{l.cable.tag}</Link>
                      {l.cable.origin === "scenario" && <span className="ml-1.5 rounded bg-teal-soft px-1 text-[10px] font-semibold text-teal">SCENARIO</span>}
                      <div className="text-xs text-ink-3">{l.cable.cableType}</div>
                    </td>
                    <td className={tdCls + " whitespace-nowrap text-xs"}>{l.cable.fromEquipment} → {l.cable.toEquipment}</td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: familyColor(l.cable.cableFamily) }} aria-hidden="true" />
                        {familyLabel(l.cable.cableFamily)}
                      </span>
                    </td>
                    <td className={tdNum}>{l.cable.outsideDiameterMm}</td>
                    <td className={tdNum}>{l.cable.quantity}</td>
                    <td className={tdNum}>{fmtNum(l.unitAreaMm2, 1)}</td>
                    <td className={tdNum + " font-semibold"}>{fmtNum(l.totalAreaMm2, 1)}</td>
                    <td className={tdNum}>{t.grossAreaMm2 ? fmtPct((l.totalAreaMm2 / t.grossAreaMm2) * 100) : "—"}</td>
                  </tr>
                ))}
                <tr className="bg-canvas font-semibold">
                  <td className={tdCls} colSpan={6}>Total assigned cable area</td>
                  <td className={tdNum}>{fmtNum(t.cableAreaMm2, 1)}</td>
                  <td className={tdNum}>{fmtPct(t.fillPct)}</td>
                </tr>
              </tbody>
            </TableWrap>
          )}
        </Card>
        <div className="grid content-start gap-5">
          <Card title="Cross-section (illustrative)" subtitle={`${t.tray.usableWidthMm} mm usable width × ${t.tray.usableHeightMm} mm side height`}>
            <CrossSection t={t} />
            <div className="mt-2">
              <FamilyLegend families={families} />
            </div>
          </Card>
          <Card title="Location in layout">
            <TrayLayout trays={analysis.trays} selected={t.tray.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
