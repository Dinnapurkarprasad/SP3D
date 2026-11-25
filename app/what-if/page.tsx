import type { Metadata } from "next";
import { WhatIfView } from "@/components/views/WhatIf";

export const metadata: Metadata = { title: "What-if" };

export default function Page() {
  return <WhatIfView />;
}
