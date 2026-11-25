import Link from "next/link";
import { STATUS_LABEL } from "@/lib/calc";
import type { AlertSeverity, FillStatus } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const STATUS_STYLE: Record<FillStatus, string> = {
  OK: "bg-ok-bg text-ok ring-ok/30",
  WARNING: "bg-warn-bg text-warn ring-warn/30",
  CHECK_LIMIT: "bg-crit-bg text-crit ring-crit/30",
  DATA_ISSUE: "bg-issue-bg text-issue ring-issue/40",
};
const STATUS_ICON: Record<FillStatus, string> = { OK: "●", WARNING: "▲", CHECK_LIMIT: "■", DATA_ISSUE: "?" };

export function StatusBadge({ status, className }: { status: FillStatus; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        STATUS_STYLE[status],
        className,
      )}
    >
      <span aria-hidden="true" className="text-[10px]">
        {STATUS_ICON[status]}
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}

const SEV_STYLE: Record<AlertSeverity, string> = {
  critical: "bg-crit-bg text-crit ring-crit/30",
  warning: "bg-warn-bg text-warn ring-warn/30",
  info: "bg-teal-soft text-teal ring-teal/30",
};
export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span className={cx("inline-flex rounded-md px-2 py-0.5 text-xs font-semibold uppercase ring-1 ring-inset", SEV_STYLE[severity])}>
      {severity}
    </span>
  );
}

export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded border border-dashed border-teal/60 bg-teal-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal",
        className,
      )}
    >
      Simulated data
    </span>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
  id,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx("print-avoid rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-navy sm:text-2xl">{title}</h1>
          <SimulatedBadge />
        </div>
        {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  tone?: "neutral" | "warn" | "crit" | "ok";
  href?: string;
}) {
  const toneBar = { neutral: "bg-brand", warn: "bg-warn-mark", crit: "bg-crit", ok: "bg-ok" }[tone];
  const body = (
    <div className="relative h-full overflow-hidden rounded-lg border border-line bg-surface p-4 transition hover:border-brand/40">
      <span aria-hidden="true" className={cx("absolute inset-y-0 left-0 w-1", toneBar)} />
      <p className="text-xs font-medium text-ink-3">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="tabular text-2xl font-semibold text-ink">{value}</span>
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-2">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full rounded-lg">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const v = {
    primary: "bg-brand text-white hover:bg-navy border-brand",
    secondary: "bg-surface text-ink border-line hover:border-brand/50 hover:bg-canvas",
    ghost: "bg-transparent text-brand border-transparent hover:bg-teal-soft",
    danger: "bg-surface text-crit border-crit/40 hover:bg-crit-bg",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        v,
        className,
      )}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-3 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "crit";
  title?: string;
  children: React.ReactNode;
}) {
  const s = {
    info: "border-teal/30 bg-teal-soft text-ink",
    warn: "border-warn/30 bg-warn-bg text-ink",
    crit: "border-crit/30 bg-crit-bg text-ink",
  }[tone];
  return (
    <div className={cx("rounded-lg border px-4 py-3 text-sm", s)} role={tone === "info" ? "note" : "status"}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3">{children}</p>;
}
