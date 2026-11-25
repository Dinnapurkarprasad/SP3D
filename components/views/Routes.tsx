"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppState } from "../AppState";
import { Button, Card, PageHeader } from "../ui";
import { SearchBox, Select, TableWrap, Th, cx, highlightCls, tdCls, tdNum, useHashTarget, useSort } from "../tableExports";
import { cableHref, trayHref } from "@/lib/links";
import { downloadCsv } from "@/lib/csv";
import { routeAssignmentsCsv, stamp } from "@/lib/exports";
import type { AssignmentResult, AssignmentStatus } from "@/lib/types";

const STATUS_TEXT: Record<AssignmentStatus, { label: string; cls: string }> = {
  VALID: { label: "Valid", cls: "bg-ok-bg text-ok" },
  UNKNOWN_TRAY: { label: "Unknown tray", cls: "bg-crit-bg text-crit" },
  UNKNOWN_CABLE: { label: "Unknown cable", cls: "bg-crit-bg text-crit" },
  INVALID_CABLE_DATA: { label: "Invalid cable data", cls: "bg-crit-bg text-crit" },
  DUPLICATE: { label: "Duplicate (ignored)", cls: "bg-warn-bg text-warn" },
};

export function RoutesView() {
  const { analysis, settings } = useAppState();
  const hash = useHashTarget();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"ALL" | AssignmentStatus>("ALL");
  const cableById = useMemo(() => new Map(analysis.cables.map((c) => [c.cable.id, c])), [analysis.cables]);

  const filtered = useMemo(
    () =>
      analysis.assignments.filter((r) => {
        const tag = cableById.get(r.assignment.cableId)?.cable.tag ?? "";
        return (
          (st === "ALL" || r.status === st) &&
          `${r.assignment.id} ${r.assignment.cableId} ${tag} ${r.assignment.trayId} ${r.assignment.segmentName} ${r.assignment.notes}`
            .toLowerCase()
            .includes(q.toLowerCase())
        );
      }),
    [analysis.assignments, q, st, cableById],
  );
  const sort = useSort<AssignmentResult>(
    filtered,
    {
      id: (r) => r.assignment.id,
      cable: (r) => r.assignment.cableId,
      tray: (r) => r.assignment.trayId,
      seq: (r) => r.assignment.sequence,
      status: (r) => r.status,
    },
    "id",
  );
  const filterNote = [st !== "ALL" && `status = ${STATUS_TEXT[st].label}`, q && `search "${q}"`].filter(Boolean).join(", ");

  // Route paths: valid trays per cable in sequence order
  const paths = analysis.cables
    .filter((c) => c.routedTrayIds.length > 0)
    .map((c) => ({ c, path: c.routedTrayIds }));

  return (
    <>
      <PageHeader
        title="Route assignments"
        description="Which tray segments each cable passes through. A cable is counted once in every tray it passes through, and never twice in the same tray."
        actions={
          <Button onClick={() => downloadCsv(`route-assignments_${stamp()}.csv`, routeAssignmentsCsv(sort.sorted, settings, filterNote || undefined))}>
            ⭳ Export CSV ({sort.sorted.length})
          </Button>
        }
      />

      <Card title="Cable route paths" subtitle="Only trusted assignments, in sequence order: equipment → tray segments → equipment.">
        <ul className="grid gap-2 md:grid-cols-2">
          {paths.map(({ c, path }) => (
            <li key={c.cable.id} className="rounded-md border border-line px-3 py-2 text-sm">
              <Link href={cableHref(c.cable.id)} className="font-medium text-brand hover:underline">{c.cable.tag}</Link>
              <span className="ml-2 text-xs text-ink-3">{c.cable.cableFamily || "Unclassified"}</span>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                <span className="rounded bg-navy px-1.5 py-0.5 font-semibold text-white">{c.cable.fromEquipment}</span>
                {path.map((p, i) => (
                  <span key={p + i} className="flex items-center gap-1">
                    <span aria-hidden="true" className="text-ink-3">→</span>
                    <Link href={trayHref(p)} className="rounded border border-line bg-canvas px-1.5 py-0.5 font-medium hover:border-brand">{p}</Link>
                  </span>
                ))}
                <span aria-hidden="true" className="text-ink-3">→</span>
                <span className="rounded bg-navy px-1.5 py-0.5 font-semibold text-white">{c.cable.toEquipment}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-5" title="All route assignment records">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search assignment, cable, tray…" />
          <Select
            label="Validation"
            value={st}
            onChange={(v) => setSt(v as typeof st)}
            options={[{ value: "ALL", label: "All" }, ...(Object.keys(STATUS_TEXT) as AssignmentStatus[]).map((s) => ({ value: s, label: STATUS_TEXT[s].label }))]}
          />
          <span className="text-xs text-ink-3">
            {sort.sorted.length} of {analysis.assignments.length} records · {analysis.kpis.trustedAssignmentCount} included in calculations
          </span>
        </div>
        <TableWrap caption="Route assignments">
          <thead>
            <tr>
              <Th label="Assignment" sortKey="id" sort={sort} />
              <Th label="Cable" sortKey="cable" sort={sort} />
              <Th label="Tray" sortKey="tray" sort={sort} />
              <Th label="Segment" />
              <Th label="Seq." sortKey="seq" sort={sort} align="right" />
              <Th label="Validation" sortKey="status" sort={sort} />
              <Th label="Reason / notes" />
            </tr>
          </thead>
          <tbody>
            {sort.sorted.map((r) => {
              const anchor = `route-${r.assignment.id}`;
              const cable = cableById.get(r.assignment.cableId);
              const s = STATUS_TEXT[r.status];
              return (
                <tr key={r.assignment.id} id={anchor} className={cx("scroll-mt-24 hover:bg-canvas", hash === anchor && highlightCls)}>
                  <td className={tdCls + " font-medium"}>{r.assignment.id}</td>
                  <td className={tdCls}>
                    {cable ? (
                      <Link href={cableHref(cable.cable.id)} className="text-brand hover:underline">{cable.cable.tag}</Link>
                    ) : (
                      <span className="font-semibold text-crit">{r.assignment.cableId}</span>
                    )}
                    <div className="text-xs text-ink-3">{r.assignment.cableId}</div>
                  </td>
                  <td className={tdCls}>
                    {r.status === "UNKNOWN_TRAY" ? (
                      <span className="font-semibold text-crit">{r.assignment.trayId}</span>
                    ) : (
                      <Link href={trayHref(r.assignment.trayId)} className="text-brand hover:underline">{r.assignment.trayId}</Link>
                    )}
                  </td>
                  <td className={tdCls + " text-xs"}>{r.assignment.segmentName}</td>
                  <td className={tdNum}>{r.assignment.sequence}</td>
                  <td className={tdCls}>
                    <span className={cx("whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold", s.cls)}>{s.label}</span>
                  </td>
                  <td className={tdCls + " text-xs"}>
                    <div className={r.trusted ? "text-ink-2" : "text-crit"}>{r.reason}</div>
                    {r.assignment.notes && <div className="text-ink-3">{r.assignment.notes}</div>}
                  </td>
                </tr>
              );
            })}
            {sort.sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-ink-3">No assignments match the current filters.</td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
