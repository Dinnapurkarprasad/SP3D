import type { Metadata } from "next";
import { RulesView } from "@/components/views/Rules";

export const metadata: Metadata = { title: "Rules" };

export default function Page() {
  return <RulesView />;
}
