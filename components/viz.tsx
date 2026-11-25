"use client";

import Link from "next/link";
import { useState } from "react";
import { CABLE_FAMILIES, layout } from "@/lib/data";
import { fmtArea, fmtNum, fmtPct } from "@/lib/format";
import { trayHref } from "@/lib/links";
import { packCrossSection } from "@/lib/packing";
import { STATUS_LABEL } from "@/lib/calc";
import type { FillStatus, TrayResult } from "@/lib/types";
import { StatusBadge, cx } from "./ui";

/* ---------- colour helpers ---------- */

export const STATUS_FILL: Record<FillStatus, string> = {
  OK: "#1a7f37",
  WARNING: "#e09b00",
  CHECK_LIMIT: "#b42318",
  DATA_ISSUE: "#8a8f98",
};

const FAMILY_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
export function familyColor(family: string): string {
  const i = (CABLE_FAMILIES as readonly string[]).indexOf(family);
  return i >= 0 ? FAMILY_COLORS[i] : "#8a8f98";
}
export function familyLabel(f: string) {
  return f?.trim() ? f : "Unclassified";
}

export function FamilyLegend({ families }: { families: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Cable family legend">
      {families.map((f) => (
        <li key={f} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: familyColor(f) }} />
          {familyLabel(f)}
        </li>
      ))}
    </ul>
  );
}

/* ---------- Fill bar with threshold markers ---------- */

export function FillBar({ t, showLabels = false, height = 10 }: { t: TrayResult; showLabels?: boolean; height?: number }) {
  const scaleMax = Math.max(100, Math.ceil(((t.fillPct ?? 0) + 5) / 10) * 10);
  const pos = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;
  const fill = t.fillPct ?? 0;
  return (
    <div>
      <div
        className="relative w-full rounded-full bg-canvas ring-1 ring-inset ring-line"
        style={{ height }}
        role="img"
        aria-label={`${t.tray.id} estimated fill ${fmtPct(t.fillPct)}; warning ${t.thresholds.warningPct}%, maximum ${t.thresholds.maxPct}%`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: pos(fill), background: STATUS_FILL[t.status] }}
        />
        {t.thresholdsValid && (
          <>
            <span className="absolute -inset-y-1 w-0.5 bg-warn" style={{ left: pos(t.thresholds.warningPct) }} title={`Warning ${t.thresholds.warningPct}%`} />
            <span className="absolute -inset-y-1 w-0.5 bg-crit" style={{ left: pos(t.thresholds.maxPct) }} title={`Maximum ${t.thresholds.maxPct}%`} />
          </>
        )}
      </div>
      {showLabels && (
        <div className="relative mt-1 h-4 text-[10px] text-ink-3 tabular">
          <span className="absolute left-0">0%</span>
          {t.thresholdsValid && (
            <>
              <span className="absolute -translate-x-1/2 text-warn" style={{ left: pos(t.thresholds.warningPct) }}>
                W {t.thresholds.warningPct}%
              </span>
              <span className="absolute -translate-x-1/2 text-crit" style={{ left: pos(t.thresholds.maxPct) }}>
                M {t.thresholds.maxPct}%
              </span>
            </>
          )}
          <span className="absolute right-0">{scaleMax}%</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Fill % per tray (horizontal bars, hover tooltip) ---------- */

export function FillChart({ trays }: { trays: TrayResult[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const maxVal = Math.max(60, ...trays.map((t) => (t.fillPct ?? 0) + 5), ...trays.map((t) => t.thresholds.maxPct + 10));
  const scaleMax = Math.ceil(maxVal / 10) * 10;
  const ticks = Array.from({ length: scaleMax / 10 + 1 }, (_, i) => i * 10).filter((v) => v % (scaleMax > 60 ? 20 : 10) === 0);
  const pct = (v: number) => `${(v / scaleMax) * 100}%`;

  return (
    <figure>
      <div className="relative pl-14 pr-2">
        {/* gridlines */}
        <div className="pointer-events-none absolute inset-y-0 left-14 right-2" aria-hidden="true">
          {ticks.map((v) => (
            <span key={v} className="absolute inset-y-0 w-px bg-line/70" style={{ left: pct(v) }} />
          ))}
        </div>
        <ul className="relative space-y-3 py-1">
          {trays.map((t) => {
            const v = t.fillPct ?? 0;
            const active = hover === t.tray.id;
            return (
              <li key={t.tray.id} className="relative">
                <Link
                  href={trayHref(t.tray.id)}
                  className="group block rounded-sm"
                  onMouseEnter={() => setHover(t.tray.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(t.tray.id)}
                  onBlur={() => setHover(null)}
                  aria-label={`${t.tray.id}: ${fmtPct(t.fillPct)} estimated fill, status ${STATUS_LABEL[t.status]}`}
                >
                  <span className="absolute -left-14 top-0 w-12 text-right text-xs font-semibold leading-6 text-ink">
                    {t.tray.id}
                  </span>
                  <div className="relative h-6">
                    <div
                      className={cx("absolute inset-y-0.5 left-0 rounded-r-[4px] transition-opacity", hover && !active && "opacity-40")}
                      style={{ width: pct(v), background: STATUS_FILL[t.status] }}
                    />
                    {t.thresholdsValid && (
                      <>
                        <span className="absolute -inset-y-0.5 w-0.5 bg-warn" style={{ left: pct(t.thresholds.warningPct) }} />
                        <span className="absolute -inset-y-0.5 w-0.5 bg-crit" style={{ left: pct(t.thresholds.maxPct) }} />
                      </>
                    )}
                    <span
                      className="absolute top-0 pl-1.5 text-xs font-medium leading-6 text-ink tabular"
                      style={{ left: pct(v) }}
                    >
                      {fmtPct(t.fillPct)}
                    </span>
                  </div>
                </Link>
                {active && (
                  <div
                    role="tooltip"
                    className="absolute left-1/2 top-7 z-20 w-64 -translate-x-1/2 rounded-md border border-line bg-surface p-3 text-xs shadow-lg"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">{t.tray.id}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 tabular text-ink-2">
                      <dt>Cable area</dt>
                      <dd className="text-right text-ink">{fmtArea(t.cableAreaMm2)}</dd>
                      <dt>Gross tray area</dt>
                      <dd className="text-right text-ink">{fmtArea(t.grossAreaMm2)}</dd>
                      <dt>Remaining</dt>
                      <dd className="text-right text-ink">{fmtPct(t.remainingPct)}</dd>
                      <dt>Thresholds</dt>
                      <dd className="text-right text-ink">
                        {t.thresholds.warningPct}% / {t.thresholds.maxPct}%
                      </dd>
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="relative ml-0 mt-1 h-4 text-[10px] text-ink-3 tabular" aria-hidden="true">
          {ticks.map((v) => (
            <span key={v} className="absolute -translate-x-1/2" style={{ left: pct(v) }}>
              {v}%
            </span>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-warn" aria-hidden="true" />Warning threshold</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-crit" aria-hidden="true" />Maximum threshold</span>
        <span>Bar colour = status (OK / WARNING / CHECK LIMIT). X-axis: estimated fill (%).</span>
      </figcaption>
    </figure>
  );
}

/* ---------- Cable area by family per tray (stacked, 2px gaps) ---------- */

export function FamilyStackChart({ trays }: { trays: TrayResult[] }) {
  const [hover, setHover] = useState<{ tray: string; fam: string } | null>(null);
  const families = Array.from(new Set(trays.flatMap((t) => Object.keys(t.areaByFamily)))).sort((a, b) => {
    const ia = (CABLE_FAMILIES as readonly string[]).indexOf(a);
    const ib = (CABLE_FAMILIES as readonly string[]).indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const maxArea = Math.max(1, ...trays.map((t) => t.cableAreaMm2));
  return (
    <figure>
      <FamilyLegend families={families} />
      <ul className="mt-3 space-y-3">
        {trays.map((t) => (
          <li key={t.tray.id} className="grid grid-cols-[48px_1fr_88px] items-center gap-2">
            <span className="text-xs font-semibold">{t.tray.id}</span>
            <div className="relative flex h-5 gap-[2px]" style={{ width: `${(t.cableAreaMm2 / maxArea) * 100}%` }}>
              {families
                .filter((f) => t.areaByFamily[f])
                .map((f, i, arr) => {
                  const active = hover?.tray === t.tray.id && hover.fam === f;
                  return (
                    <span
                      key={f}
                      tabIndex={0}
                      role="img"
                      aria-label={`${t.tray.id} ${familyLabel(f)}: ${fmtArea(t.areaByFamily[f])}`}
                      onMouseEnter={() => setHover({ tray: t.tray.id, fam: f })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ tray: t.tray.id, fam: f })}
                      onBlur={() => setHover(null)}
                      className={cx("relative h-full min-w-[3px] outline-offset-1", i === arr.length - 1 && "rounded-r-[4px]")}
                      style={{
                        flexGrow: t.areaByFamily[f],
                        flexBasis: 0,
                        background: familyColor(f),
                        opacity: hover && hover.tray === t.tray.id && !active ? 0.45 : 1,
                      }}
                    >
                      {active && (
                        <span className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded border border-line bg-surface px-2 py-1 text-xs text-ink shadow-md">
                          <strong>{familyLabel(f)}</strong> · {fmtArea(t.areaByFamily[f])} ·{" "}
                          {t.grossAreaMm2 ? fmtPct((t.areaByFamily[f] / t.grossAreaMm2) * 100) : "—"} of tray
                        </span>
                      )}
                    </span>
                  );
                })}
            </div>
            <span className="text-right text-xs text-ink-2 tabular">{fmtNum(t.cableAreaMm2)} mm²</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-2 text-xs text-ink-3">Total assigned cable cross-sectional area (mm²), split by cable family.</figcaption>
    </figure>
  );
}

/* ---------- Simulated SP3D-style plan view ---------- */

export function TrayLayout({ trays, selected }: { trays: TrayResult[]; selected?: string }) {
  const byId = new Map(trays.map((t) => [t.tray.id, t]));
  const [hover, setHover] = useState<string | null>(null);
  const focus = hover ?? selected ?? null;

  return (
    <figure>
      <div className="overflow-hidden rounded-md border border-line bg-[#fbfcfd]">
        <svg
          viewBox="-1500 -3700 10000 7400"
          className="h-auto w-full"
          role="img"
          aria-label="Simulated plan view of the practice tray layout: CT-01 main tray from MCC-01 with branches CT-02 to JB-01, CT-03 to M-01 and CT-04 to M-02. Trays are coloured by fill status."
        >
          <defs>
            <pattern id="grid" width="500" height="500" patternUnits="userSpaceOnUse">
              <path d="M500 0H0V500" fill="none" stroke="#e7ebf0" strokeWidth="8" />
            </pattern>
          </defs>
          <rect x="-1500" y="-3700" width="10000" height="7400" fill="url(#grid)" />

          {/* scale bar */}
          <g transform="translate(6600 3350)" fill="#6b7685" fontSize="150">
            <path d="M0 0h1000" stroke="#6b7685" strokeWidth="20" />
            <path d="M0 -60v120M1000 -60v120M500 -40v80" stroke="#6b7685" strokeWidth="20" />
            <text x="1100" y="50">1000 mm</text>
          </g>
          {/* north arrow */}
          <g transform="translate(-1200 3200)" fill="#6b7685" fontSize="160" textAnchor="middle">
            <path d="M0 -300 L90 0 L0 -60 L-90 0Z" fill="#6b7685" />
            <text y="180">N</text>
          </g>

          {/* equipment drops */}
          {layout.equipment.map((e) => {
            const from = e.kind === "motor" ? [e.cx!, e.cy! + (e.cy! > 0 ? -e.r! : e.r!)] : e.kind === "mcc" ? [e.x! + e.w!, 0] : [e.x! + e.w! / 2, e.y! + e.h!];
            return (
              <line key={`drop-${e.id}`} x1={from[0]} y1={from[1]} x2={e.connectTo[0]} y2={e.connectTo[1]} stroke="#4a5568" strokeWidth="30" strokeDasharray="80 50" />
            );
          })}

          {/* trays */}
          {layout.trays.map((lt) => {
            const t = byId.get(lt.trayId);
            const status = t?.status ?? "DATA_ISSUE";
            const [[x1, y1], [x2, y2]] = lt.points;
            const isFocus = focus === lt.trayId;
            return (
              <Link key={lt.trayId} href={trayHref(lt.trayId)} aria-label={`${lt.trayId}: ${fmtPct(t?.fillPct)} ${STATUS_LABEL[status]}`}>
                <g
                  onMouseEnter={() => setHover(lt.trayId)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(lt.trayId)}
                  onBlur={() => setHover(null)}
                  className="cursor-pointer"
                >
                  {isFocus && (
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0f6b78" strokeWidth={lt.widthMm + 140} strokeOpacity="0.25" />
                  )}
                  {/* tray body: true width in mm */}
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={STATUS_FILL[status]} strokeWidth={lt.widthMm} />
                  {/* ladder rungs */}
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeOpacity="0.45" strokeWidth={lt.widthMm - 40} strokeDasharray="25 275" />
                  <TrayLabel x={lt.labelAt[0]} y={lt.labelAt[1]} vertical={x1 === x2} id={lt.trayId} t={t} />
                </g>
              </Link>
            );
          })}

          {/* equipment */}
          {layout.equipment.map((e) =>
            e.kind === "motor" ? (
              <g key={e.id}>
                <circle cx={e.cx} cy={e.cy} r={e.r} fill="#ffffff" stroke="#17365d" strokeWidth="35" />
                <text x={e.cx} y={e.cy! + 60} textAnchor="middle" fontSize="170" fontWeight="700" fill="#17365d">M</text>
                <text x={e.cx! + e.r! + 120} y={e.cy! - 20} fontSize="190" fontWeight="700" fill="#14213d">{e.label}</text>
                <text x={e.cx! + e.r! + 120} y={e.cy! + 180} fontSize="140" fill="#4a5568">{e.subLabel}</text>
              </g>
            ) : (
              <g key={e.id}>
                <rect x={e.x} y={e.y} width={e.w} height={e.h} rx="40" fill="#ffffff" stroke="#17365d" strokeWidth="35" />
                {e.kind === "mcc" &&
                  [0, 1, 2, 3].map((i) => (
                    <line key={i} x1={e.x! + 80} x2={e.x! + e.w! - 80} y1={e.y! + 250 + i * 230} y2={e.y! + 250 + i * 230} stroke="#1f4e78" strokeWidth="20" />
                  ))}
                <text
                  x={e.kind === "mcc" ? e.x! + e.w! / 2 : e.x! + e.w! + 120}
                  y={e.kind === "mcc" ? e.y! - 260 : e.y! + 170}
                  textAnchor={e.kind === "mcc" ? "middle" : "start"}
                  fontSize="190"
                  fontWeight="700"
                  fill="#14213d"
                >
                  {e.label}
                </text>
                <text
                  x={e.kind === "mcc" ? e.x! + e.w! / 2 : e.x! + e.w! + 120}
                  y={e.kind === "mcc" ? e.y! - 90 : e.y! + 360}
                  textAnchor={e.kind === "mcc" ? "middle" : "start"}
                  fontSize="140"
                  fill="#4a5568"
                >
                  {e.subLabel}
                </text>
              </g>
            ),
          )}
        </svg>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
        {(["OK", "WARNING", "CHECK_LIMIT"] as FillStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: STATUS_FILL[s] }} aria-hidden="true" />
            {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="text-ink-3">
          Simulated plan view drawn from /public/model/practice-layout.json (tray widths to scale). Not read from an SP3D model. Click a tray to open it.
        </span>
      </figcaption>
    </figure>
  );
}

function TrayLabel({ x, y, vertical, id, t }: { x: number; y: number; vertical: boolean; id: string; t?: TrayResult }) {
  const w = 1450;
  const h = 430;
  const lx = vertical ? x + 220 : x - w / 2;
  const ly = vertical ? y - h / 2 : y - h - 230;
  return (
    <g>
      <rect x={lx} y={ly} width={w} height={h} rx="50" fill="#ffffff" stroke="#c9d2dc" strokeWidth="15" />
      <text x={lx + 70} y={ly + 175} fontSize="170" fontWeight="700" fill="#14213d">{id}</text>
      <text x={lx + w - 70} y={ly + 175} fontSize="170" fontWeight="700" textAnchor="end" fill={t ? STATUS_FILL[t.status] : "#8a8f98"}>
        {fmtPct(t?.fillPct)}
      </text>
      <text x={lx + 70} y={ly + 345} fontSize="125" fill="#4a5568">
        {t ? `${t.tray.usableWidthMm}×${t.tray.usableHeightMm} mm · ${STATUS_LABEL[t.status]}` : "—"}
      </text>
    </g>
  );
}

/* ---------- Illustrative tray cross-section ---------- */

export function CrossSection({ t, extra }: { t: TrayResult; extra?: { od: number; qty: number } | null }) {
  const W = t.tray.usableWidthMm;
  const H = t.tray.usableHeightMm;
  const items = t.lines.flatMap((l) =>
    Array.from({ length: l.cable.quantity }, (_, i) => ({
      key: `${l.cable.id}-${i}`,
      diameterMm: l.cable.outsideDiameterMm,
      family: l.cable.cableFamily,
      label: `${l.cable.tag} · OD ${l.cable.outsideDiameterMm} mm · ${familyLabel(l.cable.cableFamily)}`,
    })),
  );
  if (extra && extra.od > 0 && Number.isInteger(extra.qty) && extra.qty > 0 && extra.qty <= 50)
    for (let i = 0; i < extra.qty; i++)
      items.push({ key: `proposed-${i}`, diameterMm: extra.od, family: "__proposed", label: `Proposed cable · OD ${extra.od} mm` });

  const pack = packCrossSection(items, W, H);
  const pad = 14;
  const viewH = Math.max(H, pack.usedHeightMm) + pad * 2 + 10;
  const viewW = W + pad * 2;
  const y = (fromBottom: number) => viewH - pad - fromBottom;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="h-auto w-full max-h-72"
        role="img"
        aria-label={`Illustrative cross-section of ${t.tray.id}, ${W} by ${H} mm, with ${items.length} cable pieces.`}
      >
        {/* usable area */}
        <rect x={pad} y={y(H)} width={W} height={H} fill="#f4f6f9" />
        {/* tray profile: base + side rails */}
        <path d={`M${pad} ${y(H)} V${y(0)} H${pad + W} V${y(H)}`} fill="none" stroke="#17365d" strokeWidth="2.5" />
        {/* side height line */}
        <line x1={pad - 6} x2={pad + W + 6} y1={y(H)} y2={y(H)} stroke="#b42318" strokeWidth="0.8" strokeDasharray="4 3" />
        {pack.circles.map((c) => (
          <circle
            key={c.key}
            cx={pad + c.cx}
            cy={y(c.cy)}
            r={c.r - 0.4}
            fill={c.family === "__proposed" ? "#ffffff" : familyColor(c.family)}
            stroke={c.family === "__proposed" ? "#0f6b78" : "#ffffff"}
            strokeWidth={c.family === "__proposed" ? 1.6 : 1}
            strokeDasharray={c.family === "__proposed" ? "3 2" : undefined}
          >
            <title>{c.label}</title>
          </circle>
        ))}
        <text x={pad + W} y={y(H) - 4} fontSize="7" textAnchor="end" fill="#b42318">side height {H} mm</text>
        <text x={pad + W / 2} y={viewH - 2} fontSize="7" textAnchor="middle" fill="#4a5568">usable width {W} mm</text>
      </svg>
      <figcaption className="mt-1 text-xs text-ink-3">
        Illustrative arrangement only (largest cables laid first, in rows). Fill % uses the area ratio, not this picture.
        {pack.exceedsSideHeight && (
          <span className="mt-1 block font-medium text-crit">
            In this simple single-layer arrangement the cables rise above the {H} mm side height — review layering and tray
            sizing.
          </span>
        )}
      </figcaption>
    </figure>
  );
}
