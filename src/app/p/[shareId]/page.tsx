import type { Metadata } from "next";
import { SharedPlaylist } from "@/components/SharedPlaylist";

type PageParams = { params: Promise<{ shareId: string }> };

function titleFromShareId(shareId: string) {
  const readable = decodeURIComponent(shareId).replace(/[-_]+/g, " ").trim();
  return readable ? readable.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Set compartido";
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { shareId } = await params;
  const title = titleFromShareId(shareId);
  const url = `https://corocumbres.online/p/${encodeURIComponent(shareId)}`;

  return {
    title,
    description: "Set compartido de CORO CUMBRES.",
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | CORO CUMBRES`,
      description: "Set compartido de CORO CUMBRES.",
      url,
      siteName: "CORO CUMBRES",
      type: "article"
    }
  };
}

export default async function Page({ params }: PageParams) {
  const { shareId } = await params;
  return <SharedPlaylist shareId={shareId} />;
}
