import type { Metadata } from "next";
import { RoutesView } from "@/components/views/Routes";

export const metadata: Metadata = { title: "Routes" };

export default function Page() {
  return <RoutesView />;
}
