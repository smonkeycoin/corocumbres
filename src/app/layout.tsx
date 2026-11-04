import type { Metadata } from "next";
import "./globals.css";
import "./v2.css";
import "./admin-v2.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://corocumbres.online"),
  title: { default: "Coro Cumbres", template: "%s | Coro Cumbres" },
  description: "Música que nos une en la fe. Encuentra las canciones de tu misa.",
  applicationName: "Coro Cumbres",
  openGraph: { title: "Coro Cumbres", description: "Música que nos une en la fe.", url: "https://corocumbres.online", siteName: "Coro Cumbres", type: "website" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
