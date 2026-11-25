import type { Metadata } from "next";
import { CablesView } from "@/components/views/Cables";

export const metadata: Metadata = { title: "Cables" };

export default function Page() {
  return <CablesView />;
}
