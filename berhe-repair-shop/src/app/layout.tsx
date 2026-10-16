import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "BerheRepairShop — Your credit. Your control.",
  description: "Explore 64 company options from the CFPB 2025 consumer reporting list. Prepare disputes, organize reports, and track report and freeze request plans with dated source guidance.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
