import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "StudioOps", description: "Work management for small studios" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body suppressHydrationWarning>{children}</body></html>; }
