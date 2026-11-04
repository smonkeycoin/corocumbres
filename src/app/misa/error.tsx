"use client";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/v2/PublicPortal";
export default function ErrorPage({ reset }: {reset:()=>void}) {
 return <div className="v2-app"><PublicHeader/><main className="v2-content"><h1>No pudimos cargar esta playlist</h1><p>Intenta nuevamente en un momento.</p><button className="v2-button v2-button-primary" onClick={reset}>Volver a intentar</button><Link className="v2-text-link" href="/">Regresar a las misas</Link></main><PublicFooter/></div>;
}
