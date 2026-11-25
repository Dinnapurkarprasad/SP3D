// Illustrative-only cross-section arrangement: lays cables in rows across the tray width,
// largest first. It is a VISUAL AID — the fill % uses the area-ratio formula, not this layout.

export interface PackItem {
  key: string;
  diameterMm: number;
  family: string;
  label: string;
}
export interface PackedCircle extends PackItem {
  cx: number;
  cy: number; // measured from the tray bottom, upward
  r: number;
}
export interface PackResult {
  circles: PackedCircle[];
  /** Height (mm) used by the illustrative arrangement. */
  usedHeightMm: number;
  exceedsSideHeight: boolean;
}

export function packCrossSection(items: PackItem[], widthMm: number, heightMm: number): PackResult {
  const sorted = [...items].sort((a, b) => b.diameterMm - a.diameterMm);
  const circles: PackedCircle[] = [];
  let rowBase = 0;
  let rowHeight = 0;
  let x = 0;
  for (const it of sorted) {
    const d = it.diameterMm;
    if (x + d > widthMm && x > 0) {
      rowBase += rowHeight;
      rowHeight = 0;
      x = 0;
    }
    circles.push({ ...it, r: d / 2, cx: x + d / 2, cy: rowBase + d / 2 });
    x += d;
    rowHeight = Math.max(rowHeight, d);
  }
  const used = rowBase + rowHeight;
  return { circles, usedHeightMm: used, exceedsSideHeight: used > heightMm };
}
