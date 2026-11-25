export const LIMITATIONS = [
  "This geometric area ratio is a simplified learning estimate, not a certified tray-fill calculation.",
  "It does not model how cables actually pack or are arranged, the usable tray profile, cable layering, spacing, bend radius, tray type details, thermal derating, ampacity, support loading or segregation distances.",
  "It does not establish compliance with electrical codes or project specifications.",
  "All results require review against approved project documents, manufacturer data and applicable standards before engineering use.",
  "All records are SIMULATED DATA. The tray layout is a visual simulation and is not read from a real SP3D model.",
];

export function LimitationsList({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={compact ? "grid gap-x-6 gap-y-1.5 text-sm text-ink-2 md:grid-cols-2" : "space-y-2 text-sm text-ink-2"}>
      {LIMITATIONS.map((l) => (
        <li key={l} className="flex gap-2">
          <span aria-hidden="true" className="mt-0.5 text-warn">
            ⚠
          </span>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}
