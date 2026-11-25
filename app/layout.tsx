import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/components/AppState";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: {
    default: "Smart Cable Guardian 360",
    template: "%s · Smart Cable Guardian 360",
  },
  description:
    "Educational prototype: estimated cable-tray fill from simulated SP3D-style tray and cable data. SIMULATED DATA — not a certified calculation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppStateProvider>
          <Shell>{children}</Shell>
        </AppStateProvider>
      </body>
    </html>
  );
}
