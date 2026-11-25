"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppState } from "../AppState";
import { Button, Card, PageHeader, StatusBadge } from "../ui";
import { FillBar } from "../viz";
import { SearchBox, Select, TableWrap, Th, tdCls, tdNum, useSort } from "../table";
import { fmtNum, fmtPct } from "@/lib/format";
import { trayHref } from "@/lib/links";
import { downloadCsv } from "@/lib/csv";
import { stamp, trayAnalysisCsv } from "@/lib/exports";
import { STATUS_LABEL } from "@/lib/calc";
import type { FillStatus, TrayResult } from "@/lib/types";

export function TraysView() {
  const { analysis, settings } = useAppState();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | FillStatus>("ALL");

  const filtered = useMemo(
    () =>
      analysis.trays.filter(
        (t) =>
          (status === "ALL" || t.status === status) &&
          `${t.tray.id} ${t.tray.role} ${t.tray.area} ${t.tray.level} ${t.tray.trayType}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [analysis.trays, q, status],
  );
  const sort = useSort<TrayResult>(
    filtered,
    {
      id: (t) => t.tray.id,
      width: (t) => t.tray.usableWidthMm,
      gross: (t) => t.grossAreaMm2,
      area: (t) => t.cableAreaMm2,
      fill: (t) => t.fillPct,
      remaining: (t) => t.remainingPct,
      status: (t) => STATUS_LABEL[t.status],
    },
    "id",
  );
  const filterNote = [status !== "ALL" && `status = ${STATUS_LABEL[status]}`, q && `search "${q}"`].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        title="Tray register"
        description="Each tray's usable dimensions, the cable area assigned to it, and its estimated fill. Select a tray to see its cables and cross-section."
        actions={
          <Button
            onClick={() => downloadCsv(`tray-analysis_${stamp()}.csv`, trayAnalysisCsv(sort.sorted, settings, filterNote || undefined))}
          >
            ⭳ Export CSV ({sort.sorted.length})
          </Button>
        }
      />
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search tray ID, role, area…" />
          <Select
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as typeof status)}
            options={[{ value: "ALL", label: "All" }, ...(["OK", "WARNING", "CHECK_LIMIT", "DATA_ISSUE"] as FillStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
          />
          <span className="text-xs text-ink-3">
            {sort.sorted.length} of {analysis.trays.length} trays · units mm / mm² / %
          </span>
        </div>
        <TableWrap caption="Tray register with estimated fill">
          <thead>
            <tr>
              <Th label="Tray" sortKey="id" sort={sort} />
              <Th label="Role / location" />
              <Th label="W × H (mm)" sortKey="width" sort={sort} align="right" />
              <Th label="Gross area (mm²)" sortKey="gross" sort={sort} align="right" />
              <Th label="Cable area (mm²)" sortKey="area" sort={sort} align="right" />
              <Th label="Est. fill (%)" sortKey="fill" sort={sort} align="right" />
              <Th label="Remaining (%)" sortKey="remaining" sort={sort} align="right" />
              <Th label="Thresholds W / M (%)" align="right" />
              <Th label="Status" sortKey="status" sort={sort} />
            </tr>
          </thead>
          <tbody>
            {sort.sorted.map((t) => (
              <tr key={t.tray.id} className="hover:bg-canvas">
                <td className={tdCls}>
                  <Link href={trayHref(t.tray.id)} className="font-semibold text-brand hover:underline">
                    {t.tray.id}
                  </Link>
                </td>
                <td className={tdCls}>
                  <div>{t.tray.role}</div>
                  <div className="text-xs text-ink-3">
                    {t.tray.area} · {t.tray.level} · {t.tray.trayType}
                  </div>
                </td>
                <td className={tdNum}>
                  {t.tray.usableWidthMm} × {t.tray.usableHeightMm}
                </td>
                <td className={tdNum}>{fmtNum(t.grossAreaMm2)}</td>
                <td className={tdNum}>{fmtNum(t.cableAreaMm2)}</td>
                <td className={tdNum}>
                  <div className="font-semibold">{fmtPct(t.fillPct)}</div>
                  <div className="mt-1 w-24 ml-auto">
                    <FillBar t={t} height={6} />
                  </div>
                </td>
                <td className={tdNum + ((t.remainingPct ?? 0) < 0 ? " text-crit font-semibold" : "")}>{fmtPct(t.remainingPct)}</td>
                <td className={tdNum}>
                  {t.thresholds.warningPct} / {t.thresholds.maxPct}
                </td>
                <td className={tdCls}>
                  <StatusBadge status={t.status} />
                  {t.excludedCount > 0 && <div className="mt-1 text-xs text-crit">{t.excludedCount} excluded record(s)</div>}
                  {t.duplicateCount > 0 && <div className="mt-1 text-xs text-warn">{t.duplicateCount} duplicate(s) ignored</div>}
                </td>
              </tr>
            ))}
            {sort.sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-ink-3">
                  No trays match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
        <p className="mt-3 text-xs text-ink-3">
          Fill % = Σ(π × (OD/2)² × quantity) ÷ (usable width × usable height) × 100. Thresholds are user-configured,
          illustrative values — not a universal standard.
        </p>
      </Card>
    </>
  );
}
