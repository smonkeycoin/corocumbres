import type { Metadata } from "next";
import { Display } from "@/components/PresenterViews";

export const metadata: Metadata = {
  title: { absolute: "Display" },
  robots: { index: false, follow: false }
};

export default function Page() {
  return <Display />;
}
