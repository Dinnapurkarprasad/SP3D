"use client";

import { useEffect, useMemo, useState } from "react";
import { cx } from "./ui";

export type SortDir = "asc" | "desc";

export function useSort<T>(rows: T[], accessors: Record<string, (r: T) => string | number | null>, initial: string) {
  const [key, setKey] = useState(initial);
  const [dir, setDir] = useState<SortDir>("asc");
  const sorted = useMemo(() => {
    const acc = accessors[key];
    if (!acc) return rows;
    return [...rows].sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true });
      return dir === "asc" ? c : -c;
    });
    // accessors is a stable object literal per render; key/dir/rows drive recompute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, dir]);
  const toggle = (k: string) => {
    if (k === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setKey(k);
      setDir("asc");
    }
  };
  return { sorted, key, dir, toggle };
}

export function Th({
  label,
  sortKey,
  sort,
  align = "left",
  className,
}: {
  label: React.ReactNode;
  sortKey?: string;
  sort?: { key: string; dir: SortDir; toggle: (k: string) => void };
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort && sortKey === sort.key;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
      className={cx(
        "whitespace-nowrap border-b border-line bg-canvas px-3 py-2 text-xs font-semibold text-ink-2",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {sortKey && sort ? (
        <button
          type="button"
          onClick={() => sort.toggle(sortKey)}
          className={cx("inline-flex items-center gap-1 hover:text-brand", align === "right" && "flex-row-reverse")}
        >
          {label}
          <span aria-hidden="true" className={cx("text-[10px]", active ? "text-brand" : "text-ink-3/50")}>
            {active ? (sort!.dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      ) : (
        label
      )}
    </th>
  );
}

export const tdCls = "border-b border-line px-3 py-2 align-top text-sm";
export const tdNum = cx(tdCls, "text-right tabular whitespace-nowrap");

export function TableWrap({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full border-collapse bg-surface">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3">
        ⌕
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-64 max-w-full rounded-md border border-line bg-surface py-1.5 pl-7 pr-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
      />
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-2">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Returns the current URL hash (without "#") and scrolls the matching element into view.
 * Used so alert links like /cables#cable-C-1302 highlight the right row, including after
 * client-side navigation (where the CSS :target selector does not update).
 */
export function useHashTarget(): string {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => {
      const h = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      setHash(h);
      if (h) requestAnimationFrame(() => document.getElementById(h)?.scrollIntoView({ block: "center" }));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return hash;
}

export const highlightCls = "bg-warn-bg shadow-[inset_4px_0_0_#e09b00]";
