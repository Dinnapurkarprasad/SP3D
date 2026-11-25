"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppState } from "../AppState";
import { Card, EmptyState, PageHeader, SeverityBadge } from "../ui";
import { Select } from "../table";
import type { AlertType } from "@/lib/types";

const TYPE_LABEL: Record<AlertType, string> = {
  NEAR_THRESHOLD: "Near threshold",
  AT_MAX: "At/above maximum",
  UNKNOWN_TRAY: "Unknown tray",
  UNKNOWN_CABLE: "Unknown cable",
  INVALID_OD_QTY: "Invalid OD/quantity",
  UNCLASSIFIED: "Unclassified cable",
  DUPLICATE_ASSIGNMENT: "Duplicate assignment",
  INVALID_TRAY: "Invalid tray data",
};

export function AlertsView() {
  const { analysis } = useAppState();
  const [cat, setCat] = useState("ALL");
  const [sev, setSev] = useState("ALL");
  const alerts = useMemo(
    () => analysis.alerts.filter((a) => (cat === "ALL" || a.category === cat) && (sev === "ALL" || a.severity === sev)),
    [analysis.alerts, cat, sev],
  );
  const counts = {
    critical: analysis.alerts.filter((a) => a.severity === "critical").length,
    warning: analysis.alerts.filter((a) => a.severity === "warning").length,
  };

  return (
    <>
      <PageHeader
        title="Alert centre"
        description="Capacity alerts come from the configured thresholds. Data-quality alerts point to records that are excluded from, or weaken, the calculation."
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select label="Category" value={cat} onChange={setCat} options={[{ value: "ALL", label: "All" }, { value: "Capacity", label: "Capacity" }, { value: "Data quality", label: "Data quality" }]} />
          <Select label="Severity" value={sev} onChange={setSev} options={[{ value: "ALL", label: "All" }, { value: "critical", label: "Critical" }, { value: "warning", label: "Warning" }]} />
          <span className="text-xs text-ink-3">
            {alerts.length} shown · {counts.critical} critical · {counts.warning} warning
          </span>
        </div>
        {alerts.length === 0 ? (
          <EmptyState>No alerts match the current filters.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="rounded-md border border-line border-l-4 bg-surface p-4"
                style={{ borderLeftColor: a.severity === "critical" ? "#b42318" : "#e09b00" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={a.severity} />
                  <span className="rounded bg-canvas px-1.5 py-0.5 text-xs text-ink-2">{a.category}</span>
                  <span className="rounded bg-canvas px-1.5 py-0.5 text-xs text-ink-2">{TYPE_LABEL[a.type]}</span>
                </div>
                <h2 className="mt-2 text-sm font-semibold">{a.message}</h2>
                <p className="mt-0.5 text-xs text-ink-3">{a.title}</p>
                <p className="mt-2 text-sm text-ink-2">
                  <span className="font-medium text-ink">Why: </span>
                  {a.reason}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {a.links.map((l) => (
                    <Link key={l.href} href={l.href} className="font-medium text-brand hover:underline">
                      {l.label} →
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
