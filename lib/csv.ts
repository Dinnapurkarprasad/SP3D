export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** RFC 4180-style CSV: quotes fields containing comma, quote, or newline; doubles inner quotes. */
export function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[], preamble: string[] = []): string {
  const lines = [
    ...preamble.map((p) => escapeCsv(`# ${p}`)),
    columns.map((c) => escapeCsv(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => escapeCsv(c.value(r))).join(",")),
  ];
  return lines.join("\r\n") + "\r\n";
}

export const round = (v: number | null | undefined, digits = 2): number | null =>
  v === null || v === undefined || !Number.isFinite(v) ? null : Number(v.toFixed(digits));

/** Browser-only: triggers a download of the CSV text (with BOM so Excel reads UTF-8 "mm²" correctly). */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
