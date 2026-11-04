import Link from "next/link";
import { PublicHeader,PublicFooter } from "@/components/v2/PublicPortal";
export default function NotFound(){return <div className="v2-app"><PublicHeader/><main className="v2-content"><h1>No encontramos esta página</h1><p>Selecciona una misa para consultar sus canciones publicadas.</p><Link href="/" className="v2-button v2-button-primary">Seleccionar mi misa</Link></main><PublicFooter/></div>;}
