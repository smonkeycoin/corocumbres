import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://corocumbres.online"),
  title: {
    default: "CORO CUMBRES",
    template: "%s | CORO CUMBRES"
  },
  description: "Biblioteca, Sets y teleprompter manual para coro.",
  applicationName: "CORO CUMBRES",
  openGraph: {
    title: "CORO CUMBRES",
    description: "Biblioteca, Sets y teleprompter manual para coro.",
    url: "https://corocumbres.online",
    siteName: "CORO CUMBRES",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={ibmPlexMono.variable}>{children}</body>
    </html>
  );
}
