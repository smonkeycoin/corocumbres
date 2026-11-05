import type { Metadata } from "next";
import { SharedPlaylist } from "@/components/SharedPlaylist";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ shareId: string }> };

function titleFromShareId(shareId: string) {
  const readable = shareId.replace(/[-_]+/g, " ").trim();
  return readable ? readable.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Set compartido";
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { shareId } = await params;
  const title = titleFromShareId(shareId);
  const url = `https://corocumbres.online/p/${encodeURIComponent(shareId)}`;

  return {
    title,
    description: "Repertorio publicado de CORO CUMBRES.",
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | CORO CUMBRES`,
      description: "Repertorio publicado de CORO CUMBRES.",
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
