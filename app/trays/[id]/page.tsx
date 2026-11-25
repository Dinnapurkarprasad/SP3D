import type { Metadata } from "next";
import { TrayDetailView } from "@/components/views/TrayDetail";
import { sourceTrays } from "@/lib/data";

export function generateStaticParams() {
  return sourceTrays.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/trays/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Tray ${decodeURIComponent(id)}` };
}

export default async function Page({ params }: PageProps<"/trays/[id]">) {
  const { id } = await params;
  return <TrayDetailView id={decodeURIComponent(id)} />;
}
