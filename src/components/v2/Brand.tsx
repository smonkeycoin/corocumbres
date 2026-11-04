import Link from "next/link";
import type { CSSProperties } from "react";

export type IconName = "arrow-right" | "arrow-left" | "chevron-right" | "chevron-left" | "home" | "playlists" | "library" | "settings" | "presenter" | "music" | "plus" | "search" | "edit" | "check" | "close" | "grip" | "up" | "down" | "logout" | "lock" | "external" | "download" | "upload" | "menu" | "clock" | "info" | "list" | "x" | "log-out" | "monitor" | "copy" | "archive" | "user";

export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  const paths: Record<IconName, React.ReactNode> = {
    list: <><path d="M9 6h12M9 12h12M9 18h12M3 6h.1M3 12h.1M3 18h.1" /></>,
    x: <path d="m6 6 12 12M6 18 18 6" />,
    "log-out": <><path d="M10 3H4v18h6M10 12h11m-4-4 4 4-4 4" /></>,
    monitor: <><rect x="3" y="3" width="18" height="13" rx="2" /><path d="M12 16v5m-5 0h10" /></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
    archive: <><path d="M4 8v13h16V8" /><rect x="3" y="3" width="18" height="5" rx="1" /><path d="M9 12h6" /></>,
    user: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2z" /></>,
    "arrow-right": <><path d="M4 12h16M13 5l7 7-7 7" /></>,
    "arrow-left": <><path d="M20 12H4m7-7-7 7 7 7" /></>,
    "chevron-right": <path d="m9 5 7 7-7 7" />,
    "chevron-left": <path d="m15 5-7 7 7 7" />,
    home: <><path d="m3 10 9-7 9 7M5 9v12h14V9" /><path d="M9 21v-8h6v8" /></>,
    playlists: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    library: <><path d="M3 4h4v16H3zM9 4h4v16H9zM15 5l4-1 4 15-4 1z" /></>,
    settings: <><path d="m10 3-1 3-3 1-3 3 2 3v4l4 1 3 3 3-2 4-1v-4l2-3-3-3-3-1-1-3z" /><circle cx="12" cy="12" r="3" /></>,
    presenter: <><rect x="3" y="3" width="18" height="13" rx="2" /><path d="M12 16v5m-5 0h10" /><path d="m10 7 5 3-5 3z" /></>,
    music: <><path d="M9 18V5l11-2v13M9 8l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse cx="17" cy="16" rx="3" ry="2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></>,
    edit: <><path d="m15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    grip: <><circle cx="9" cy="5" r=".7" /><circle cx="15" cy="5" r=".7" /><circle cx="9" cy="12" r=".7" /><circle cx="15" cy="12" r=".7" /><circle cx="9" cy="19" r=".7" /><circle cx="15" cy="19" r=".7" /></>,
    up: <path d="m5 15 7-7 7 7" />,
    down: <path d="m5 9 7 7 7-7" />,
    logout: <><path d="M10 3H4v18h6M10 12h11m-4-4 4 4-4 4" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    external: <><path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name]}</svg>;
}

export function MountainLogo({ className }: { className?: string }) {
  return <svg viewBox="0 0 78 55" fill="none" aria-hidden="true" className={className}>
    <path d="M39 4v13m-4-8h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="m3 48 19-23 8 9 13-19 31 33-21-11-10-11-12 18-8-9-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m24 25 5 2 4-5 10 4M43 15l5 15 7-2 7 9M16 41l7-1 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return <Link href={href} className={`v2-brand${compact ? " v2-brand-compact" : ""}`} aria-label="Coro Cumbres, inicio"><MountainLogo /><span>CORO CUMBRES</span></Link>;
}

export function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.41 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04l3.35-2.59Z" /><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.35 2.59C7.2 7.7 9.4 5.95 12 5.95Z" /></svg>;
}

export function MassIcon({ massId, className }: { massId: string; className?: string }) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    {massId === "ninos" ? <>
      <path d="M13 30C9 14 24 6 32 8c17-2 26 13 20 27" fill="currentColor" opacity=".9" />
      <path d="M14 31c-8-5-10 9 0 10m36-10c8-5 10 9 0 10" fill="currentColor" opacity=".65" />
      <path d="M13 30c8-2 14-7 16-14 6 9 14 13 22 14v9c0 10-9 18-19 18s-19-8-19-18z" fill="var(--mass-face, #fff0a7)" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="24" cy="35" r="2.5" fill="currentColor" /><circle cx="40" cy="35" r="2.5" fill="currentColor" /><path d="M26 45c3 3 9 3 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </> : massId === "noche" ? <path d="M40 7a25 25 0 1 0 17 36A25 25 0 0 1 40 7Z" fill="currentColor" /> : <>
      <path d="M32 5v12m-5-7h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="m22 30 10-12 10 12v7l12 8v14H10V45l12-8z" fill="currentColor" />
      <circle cx="32" cy="32" r="4" fill="var(--mass-cutout, #176bb4)" />
      <path d="M27 59V47a5 5 0 0 1 10 0v12" fill="var(--mass-cutout, #176bb4)" />
    </>}
  </svg>;
}
