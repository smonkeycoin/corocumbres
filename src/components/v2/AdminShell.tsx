"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Brand, Icon } from "./Brand";

const navigation = [
  { href: "/admin", label: "Inicio", icon: "home" as const },
  { href: "/admin/playlists", label: "Playlists", icon: "playlists" as const },
  { href: "/admin/repertorio", label: "Repertorio", icon: "library" as const },
  { href: "/admin/configuracion", label: "Configuración", icon: "settings" as const }
];

export function AdminShell({ children, email }: { children: ReactNode; email?: string | null }) {
  const pathname = usePathname();
  return (
    <div className="v2-app admin-shell">
      <a className="admin-skip" href="#admin-main">Saltar al contenido</a>
      <aside className="admin-sidebar">
        <div className="admin-brand"><Brand href="/admin" compact /></div>
        <p className="admin-sidebar-label">ESPACIO DEL CORO</p>
        <nav aria-label="Administración">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={pathname === item.href ? "active" : ""}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/presenter"><Icon name="presenter" size={19} /><span>Presenter</span></Link>
          <Link href="/"><Icon name="external" size={19} /><span>Ver portal público</span></Link>
          <p>Música · Fe · Comunidad</p>
        </div>
      </aside>
      <div className="admin-main-column">
        <header className="admin-topbar">
          <div><span className="admin-dot" /><span>Administración privada</span></div>
          <div className="admin-account">
            <span className="admin-avatar" aria-hidden="true"><Icon name="user" size={18} /></span>
            <span className="admin-email" title={email ?? undefined}>{email ?? "Administrador"}</span>
            <button type="button" className="admin-icon-button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => void signOut({ callbackUrl: "/" })}><Icon name="logout" size={18} /></button>
          </div>
        </header>
        <main id="admin-main" className="admin-main">{children}</main>
      </div>
    </div>
  );
}
