import { Callout, Card, PageHeader } from "../ui";
import { LimitationsList } from "./Limitations";

export function AboutView() {
  return (
    <>
      <PageHeader
        title="About this prototype"
        description="What Smart Cable Guardian 360 does, how it calculates, and what it does not do."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="What it is">
          <blockquote className="border-l-4 border-teal pl-4 text-sm italic text-ink-2">
            “I developed a Next.js prototype called Smart Cable Guardian 360. It uses simulated SP3D-style cable and tray data to
            calculate estimated tray occupancy, visualize remaining area, flag configurable threshold warnings, and test proposed
            cable additions through a what-if workflow. It is a decision-support learning prototype; it is not a live SP3D
            integration or a certified design compliance tool.”
          </blockquote>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-2">
            <li>All trays, cables and route assignments are local JSON files in <code>/data</code>, marked SIMULATED DATA.</li>
            <li>The plan view is drawn from <code>/public/model/practice-layout.json</code>. It is a visual simulation; no SP3D file is read.</li>
            <li>No backend and no API keys. Threshold edits and scenario cables are saved in your browser only.</li>
          </ul>
        </Card>

        <Card title="How the estimate is calculated">
          <pre className="overflow-x-auto rounded-md bg-canvas p-3 font-mono text-xs leading-relaxed">
{`Cable area (mm²)        = π × (OD / 2)²
Cable record area (mm²) = cable area × quantity
Gross tray area (mm²)   = usable width × usable height
Estimated fill (%)      = Σ assigned cable areas / gross tray area × 100
Estimated remaining (%) = 100 − fill  (can be negative)`}
          </pre>
          <p className="mt-3 text-sm text-ink-2">Worked example, CT-04 (150 × 50 mm = 7,500 mm²):</p>
          <ul className="mt-1 space-y-0.5 font-mono text-xs text-ink-2">
            <li>3C×95 mm², OD 42 mm × 2 runs = 2 × π × 21² = 2,770.9 mm²</li>
            <li>12C×1.5 mm², OD 20 mm × 1 = π × 10² = 314.2 mm²</li>
            <li>Fill = 3,085.1 / 7,500 × 100 = 41.1 % → CHECK LIMIT at a 40 % illustrative maximum</li>
          </ul>
          <p className="mt-3 text-sm text-ink-2">
            Status: OK below the warning threshold, WARNING from the warning threshold up to the maximum, CHECK LIMIT at or above
            the maximum, and DATA ISSUE when the inputs are invalid. Thresholds are set by the user.{" "}
            <strong>There is no universal 40% rule</strong>: allowable fill depends on the code, the tray type, the cable sizes and
            the project specification.
          </p>
        </Card>

        <Card title="Engineering limitations" className="lg:col-span-2">
          <LimitationsList />
        </Card>

        <Card title="Possible future work (not implemented)" className="lg:col-span-2">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
            <li>Import verified SP3D report or export files (for example a cable schedule and tray list in CSV or Excel).</li>
            <li>Compare revisions to see which trays changed between model issues.</li>
            <li>Show cable routes in 3D and include tray length and elevation.</li>
            <li>Segregation checks that use approved project rule data.</li>
            <li>Reviewed, signed PDF reports.</li>
          </ul>
          <div className="mt-3">
            <Callout tone="info">These items should be built and tested before anyone describes them as finished features.</Callout>
          </div>
        </Card>
      </div>
    </>
  );
}
