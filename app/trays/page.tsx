import type { Metadata } from "next";
import { TraysView } from "@/components/views/Trays";

export const metadata: Metadata = { title: "Trays" };

export default function Page() {
  return <TraysView />;
}
