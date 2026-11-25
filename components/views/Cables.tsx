"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppState } from "../AppState";
import { Button, Card, PageHeader } from "../ui";
import { familyColor, familyLabel } from "../viz";
import { SearchBox, Select, TableWrap, Th, cx, highlightCls, tdCls, tdNum, useHashTarget, useSort } from "../tableExports";
import { fmtNum } from "@/lib/format";
import { trayHref } from "@/lib/links";
import { downloadCsv } from "@/lib/csv";
import { cableScheduleCsv, stamp } from "@/lib/exports";
import type { CableResult } from "@/lib/types";

export function CablesView() {
  const { analysis, settings, removeScenarioCable } = useAppState();
  const hash = useHashTarget();
  const [q, setQ] = useState("");
  const [family, setFamily] = useState("ALL");
  const [validity, setValidity] = useState("ALL");

  const families = useMemo(
    () => Array.from(new Set(analysis.cables.map((c) => familyLabel(c.cable.cableFamily)))).sort(),
    [analysis.cables],
  );
  const filtered = useMemo(
    () =>
      analysis.cables.filter((c) => {
        const text = `${c.cable.id} ${c.cable.tag} ${c.cable.fromEquipment} ${c.cable.toEquipment} ${c.cable.cableType} ${c.cable.description}`.toLowerCase();
        return (
          text.includes(q.toLowerCase()) &&
          (family === "ALL" || familyLabel(c.cable.cableFamily) === family) &&
          (validity === "ALL" || (validity === "VALID" ? c.issues.length === 0 : c.issues.length > 0))
        );
      }),
    [analysis.cables, q, family, validity],
  );
  const sort = useSort<CableResult>(
    filtered,
    {
      tag: (c) => c.cable.tag,
      from: (c) => c.cable.fromEquipment,
      to: (c) => c.cable.toEquipment,
      family: (c) => familyLabel(c.cable.cableFamily),
      od: (c) => (typeof c.cable.outsideDiameterMm === "number" ? c.cable.outsideDiameterMm : null),
      qty: (c) => (typeof c.cable.quantity === "number" ? c.cable.quantity : null),
      area: (c) => c.totalAreaMm2,
    },
    "tag",
  );
  const filterNote = [family !== "ALL" && `family = ${family}`, validity !== "ALL" && `validity = ${validity}`, q && `search "${q}"`]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title="Cable schedule"
        description="Cable records with outside diameter (OD), quantity and calculated cross-sectional area. Area per cable = π × (OD / 2)²."
        actions={
          <Button onClick={() => downloadCsv(`cable-schedule_${stamp()}.csv`, cableScheduleCsv(sort.sorted, settings, filterNote || undefined))}>
            ⭳ Export CSV ({sort.sorted.length})
          </Button>
        }
      />
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search tag, equipment, type…" />
          <Select label="Family" value={family} onChange={setFamily} options={[{ value: "ALL", label: "All" }, ...families.map((f) => ({ value: f, label: f }))]} />
          <Select
            label="Data quality"
            value={validity}
            onChange={setValidity}
            options={[
              { value: "ALL", label: "All" },
              { value: "VALID", label: "No issues" },
              { value: "ISSUES", label: "Has issues" },
            ]}
          />
          <span className="text-xs text-ink-3">
            {sort.sorted.length} of {analysis.cables.length} records · OD in mm, areas in mm²
          </span>
        </div>
        <TableWrap caption="Cable schedule">
          <thead>
            <tr>
              <Th label="Tag" sortKey="tag" sort={sort} />
              <Th label="From" sortKey="from" sort={sort} />
              <Th label="To" sortKey="to" sort={sort} />
              <Th label="Cable type" />
              <Th label="Family" sortKey="family" sort={sort} />
              <Th label="OD (mm)" sortKey="od" sort={sort} align="right" />
              <Th label="Qty" sortKey="qty" sort={sort} align="right" />
              <Th label="Area each (mm²)" align="right" />
              <Th label="Total (mm²)" sortKey="area" sort={sort} align="right" />
              <Th label="Routed through" />
              <Th label="Data quality" />
            </tr>
          </thead>
          <tbody>
            {sort.sorted.map((c) => {
              const anchor = `cable-${c.cable.id}`;
              return (
                <tr key={c.cable.id} id={anchor} className={cx("scroll-mt-24 hover:bg-canvas", hash === anchor && highlightCls)}>
                  <td className={tdCls}>
                    <div className="whitespace-nowrap font-medium">{c.cable.tag}</div>
                    <div className="text-xs text-ink-3">{c.cable.id}</div>
                    {c.cable.origin === "scenario" && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded bg-teal-soft px-1 text-[10px] font-semibold text-teal">SCENARIO</span>
                        <button type="button" className="text-xs text-crit underline" onClick={() => removeScenarioCable(c.cable.id)}>
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                  <td className={tdCls}>{c.cable.fromEquipment}</td>
                  <td className={tdCls}>{c.cable.toEquipment}</td>
                  <td className={tdCls}>
                    <div className="text-xs">{c.cable.cableType}</div>
                    <div className="text-xs text-ink-3">{c.cable.description}</div>
                  </td>
                  <td className={tdCls}>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: familyColor(c.cable.cableFamily) }} aria-hidden="true" />
                      {familyLabel(c.cable.cableFamily)}
                    </span>
                  </td>
                  <td className={tdNum + (c.issues.some((i) => i.field === "outsideDiameterMm") ? " font-semibold text-crit" : "")}>
                    {String(c.cable.outsideDiameterMm ?? "—")}
                  </td>
                  <td className={tdNum + (c.issues.some((i) => i.field === "quantity") ? " font-semibold text-crit" : "")}>
                    {String(c.cable.quantity ?? "—")}
                  </td>
                  <td className={tdNum}>{fmtNum(c.unitAreaMm2, 1)}</td>
                  <td className={tdNum + " font-semibold"}>{fmtNum(c.totalAreaMm2, 1)}</td>
                  <td className={tdCls + " whitespace-nowrap text-xs"}>
                    {c.routedTrayIds.length ? (
                      c.routedTrayIds.map((id, i) => (
                        <span key={id + i}>
                          {i > 0 && <span className="text-ink-3"> → </span>}
                          <Link href={trayHref(id)} className="text-brand hover:underline">{id}</Link>
                        </span>
                      ))
                    ) : (
                      <span className="text-ink-3">Not in any trusted calculation</span>
                    )}
                  </td>
                  <td className={tdCls + " text-xs"}>
                    {c.issues.length === 0 ? (
                      <span className="text-ok">✓ OK</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {c.issues.map((i) => (
                          <li key={i.field} className={i.field === "cableFamily" ? "text-warn" : "text-crit"}>
                            {i.field === "cableFamily" ? "▲" : "■"} {i.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
            {sort.sorted.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-sm text-ink-3">No cables match the current filters.</td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
