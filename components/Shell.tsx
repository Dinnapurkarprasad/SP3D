"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { project } from "@/lib/data";
import { useAppState } from "./AppState";
import { Button, cx, inputCls } from "./ui";

const NAV = [
  { href: "/", label: "Overview", icon: "▦" },
  { href: "/trays", label: "Trays", icon: "▭" },
  { href: "/cables", label: "Cables", icon: "≋" },
  { href: "/routes", label: "Routes", icon: "⤳" },
  { href: "/what-if", label: "What-if", icon: "±" },
  { href: "/alerts", label: "Alerts", icon: "!" },
  { href: "/rules", label: "Rules", icon: "✓" },
  { href: "/reports", label: "Reports", icon: "⎙" },
  { href: "/about", label: "About", icon: "i" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { analysis } = useAppState();
  const alertCount = analysis.alerts.length;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-brand px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* Sidebar (desktop) / top nav (mobile) */}
      <aside className="no-print bg-navy text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center gap-3 px-4 py-4">
          <Logo />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Smart Cable Guardian</p>
            <p className="text-xs text-white/60">360 · Tray fill prototype</p>
          </div>
        </div>
        <nav aria-label="Main" className="overflow-x-auto px-2 pb-3 lg:pb-6">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition",
                    isActive(n.href) ? "bg-white/15 font-semibold text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <span aria-hidden="true" className="w-4 text-center text-white/60">
                    {n.icon}
                  </span>
                  {n.label}
                  {n.href === "/alerts" && alertCount > 0 && (
                    <span className="ml-auto rounded-full bg-white/20 px-1.5 text-xs tabular" aria-label={`${alertCount} alerts`}>
                      {alertCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mx-4 mb-6 hidden rounded-md border border-white/15 p-3 text-xs text-white/70 lg:block">
          <p className="font-semibold text-white">Simulated data</p>
          <p className="mt-1">
            Educational estimate only. Not a live SP3D integration and not a certified tray-fill or compliance tool.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <TopBar />
        <main id="main" className="print-shell mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
          {children}
        </main>
        <footer className="no-print mx-auto max-w-[1400px] px-4 pb-8 text-xs text-ink-3 sm:px-6">
          SIMULATED DATA · Results are simplified geometric area-ratio estimates for learning. Review against approved project
          documents, manufacturer data and applicable standards before any engineering use.{" "}
          <Link href="/about" className="text-brand underline">
            Limitations
          </Link>
        </footer>
      </div>
    </div>
  );
}

function TopBar() {
  const { settings, hasLocalChanges, resetAll, analysis } = useAppState();
  const [open, setOpen] = useState(false);
  const scenarioCount = analysis.cables.filter((c) => c.cable.origin === "scenario").length;

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{project.name}</p>
          <p className="truncate text-xs text-ink-3">
            Rev {project.revision} · {project.modelName} · Units: {project.units}
          </p>
        </div>
        <span className="rounded bg-crit px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
          Simulated data
        </span>
        {scenarioCount > 0 && (
          <Link href="/what-if" className="rounded bg-teal-soft px-2 py-1 text-xs font-medium text-teal ring-1 ring-teal/30">
            {scenarioCount} scenario cable{scenarioCount > 1 ? "s" : ""}
          </Link>
        )}
        <Button onClick={() => setOpen(true)} aria-haspopup="dialog">
          <span aria-hidden="true">⚙</span>
          Thresholds:{" "}
          {settings.mode === "global"
            ? `${settings.global.warningPct}% / ${settings.global.maxPct}%`
            : "per tray"}
          <span className="text-xs text-ink-3">(illustrative)</span>
        </Button>
        {hasLocalChanges && (
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm("Reset thresholds, scenario cables and rule edits to the source data?")) resetAll();
            }}
          >
            Reset to source data
          </Button>
        )}
      </div>
      {open && <ThresholdDialog onClose={() => setOpen(false)} />}
    </header>
  );
}

function ThresholdDialog({ onClose }: { onClose: () => void }) {
  const { settings, setSettings } = useAppState();
  const [mode, setMode] = useState(settings.mode);
  const [warn, setWarn] = useState(String(settings.global.warningPct));
  const [max, setMax] = useState(String(settings.global.maxPct));
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  const w = Number(warn);
  const m = Number(max);
  const valid = Number.isFinite(w) && Number.isFinite(m) && w > 0 && m > w && m <= 200;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="thr-title"
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-lg border border-line p-0 shadow-xl backdrop:bg-navy/40"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          if (mode === "global" && !valid) {
            e.preventDefault();
            return;
          }
          setSettings({ mode, global: mode === "global" ? { warningPct: w, maxPct: m } : settings.global });
        }}
      >
        <div className="border-b border-line px-5 py-4">
          <h2 id="thr-title" className="text-base font-semibold text-navy">
            Fill threshold settings
          </h2>
          <p className="mt-1 text-xs text-ink-2">
            Thresholds are <strong>user-configured, illustrative demo inputs</strong>. There is no universal tray-fill
            percentage: real limits come from the approved project specification and the applicable code/standard for the
            tray type and cable construction.
          </p>
        </div>
        <fieldset className="space-y-3 px-5 py-4">
          <legend className="sr-only">Threshold source</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="mode" checked={mode === "tray"} onChange={() => setMode("tray")} className="mt-1" />
            <span>
              <span className="font-medium">Use each tray&apos;s own thresholds</span>
              <span className="block text-xs text-ink-3">From trays.json (warningThresholdPct / maxThresholdPct).</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="mode" checked={mode === "global"} onChange={() => setMode("global")} className="mt-1" />
            <span>
              <span className="font-medium">Override all trays</span>
              <span className="block text-xs text-ink-3">Apply one warning / maximum pair to every tray.</span>
            </span>
          </label>
          <div className={cx("grid grid-cols-2 gap-3 pl-6", mode !== "global" && "pointer-events-none opacity-50")}>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-ink-2">Warning threshold (%)</span>
              <input
                className={inputCls}
                type="number"
                min={1}
                step={1}
                value={warn}
                onChange={(e) => setWarn(e.target.value)}
                disabled={mode !== "global"}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-ink-2">Maximum threshold (%)</span>
              <input
                className={inputCls}
                type="number"
                min={1}
                step={1}
                value={max}
                onChange={(e) => setMax(e.target.value)}
                disabled={mode !== "global"}
              />
            </label>
            {mode === "global" && !valid && (
              <p className="col-span-2 text-xs text-crit" role="alert">
                Warning must be greater than 0 and lower than the maximum (max ≤ 200%).
              </p>
            )}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-line bg-canvas px-5 py-3">
          <Button onClick={() => ref.current?.close()}>Cancel</Button>
          <button
            type="submit"
            disabled={mode === "global" && !valid}
            className="rounded-md border border-brand bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-navy disabled:opacity-50"
          >
            Apply thresholds
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="7" fill="#0F6B78" />
      <path d="M7 12h20M7 22h20" stroke="#fff" strokeWidth="2" />
      <path d="M7 12v10M27 12v10" stroke="#fff" strokeWidth="2" />
      <circle cx="13" cy="18.5" r="2.6" fill="#fff" />
      <circle cx="19" cy="18.5" r="2.6" fill="#fff" opacity=".7" />
      <circle cx="16" cy="14.6" r="1.8" fill="#fff" opacity=".85" />
    </svg>
  );
}
