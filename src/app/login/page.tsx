import Link from "next/link";
import { Brand, GoogleMark, Icon } from "@/components/v2/Brand";
import { getAdminAccess } from "@/lib/supabase/auth";
import { DENIED_MESSAGE, safeAuthRedirect } from "@/lib/supabase/auth-policy";
import { CONFIGURATION_MESSAGE } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const access = await getAdminAccess();
  const configured = access.status !== "unconfigured";
  const messages: Record<string, string> = {
    denied: DENIED_MESSAGE,
    configuration: CONFIGURATION_MESSAGE,
    unavailable: "No se pudieron verificar los permisos. Inténtalo nuevamente.",
    oauth: "No se pudo completar el inicio de sesión. Inténtalo nuevamente con Google.",
    logout: "No se pudo cerrar la sesión. Inténtalo nuevamente.",
  };
  const message = !configured ? CONFIGURATION_MESSAGE : access.status === "denied" ? DENIED_MESSAGE : messages[params.error ?? ""];
  return <div className="v2-app v2-login-app">
    <main className="v2-login-main">
      <Link href="/" className="v2-back-link v2-login-back"><Icon name="arrow-left" size={18} />Volver al portal</Link>
      <section className="v2-login-card" aria-labelledby="login-title">
        <div className="v2-login-brand"><Brand /></div>
        <h1 id="login-title">Acceso para administradores</h1>
        <p className="v2-login-description">Inicia sesión con tu cuenta de Google para gestionar las playlists y el repertorio del coro.</p>
        {message ? <div className="v2-login-error" role="alert" id="login-status"><Icon name="info" size={18} /><p>{message}</p></div> : null}
        {access.status === "admin" ? <Link href="/admin" className="v2-google-button"><Icon name="playlists" size={20} /><span>Entrar a administración</span></Link> : <form action="/auth/signin" method="post">
          <input type="hidden" name="next" value={safeAuthRedirect(params.next)} />
          <button className="v2-google-button" disabled={!configured} type="submit" aria-describedby={message ? "login-status" : undefined}><GoogleMark /><span>Iniciar sesión con Google</span></button>
        </form>}
        {configured && access.status !== "anonymous" ? <form action="/auth/signout" method="post"><button type="submit" className="v2-button v2-button-secondary" style={{ marginTop: 16 }}><Icon name="logout" size={16} />Cerrar sesión</button></form> : null}
        <p className="v2-login-restriction"><Icon name="lock" size={14} /><span>Solo los administradores autorizados del coro<br className="v2-login-break" /> pueden acceder a esta sección.</span></p>
        <svg className="v2-login-mountains" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true"><path d="m0 55 25-10 27 7 32-30 47 40 41-2 59 25 51-24 35 20 64-49 54 49 51-33 23 5 49-41 72 47 45 10v31H0Z" fill="#edf1f6" /><path d="m0 59 29-7 30 14 34-18 62 26 50-7 68 26 46-15 66-49 51 43 55-25 66 34 43-6v25H0Z" fill="#e1e8f1" /><path d="m0 69 35-22 38 10 26-13 61 39 43-8 48 25h-251Zm342 31 79-65 19 14 20-5 76 43 64-17v30Z" fill="#d2dce9" /><path d="m399 53 22-18 19 14 20-5-20 12-18-10Z" fill="#f6f8fb" /></svg>
      </section>
      <p className="v2-login-public-link">¿Vienes a cantar? <Link href="/">Encuentra tu misa<Icon name="arrow-right" size={15} /></Link></p>
    </main>
    <footer className="v2-public-footer"><span>Coro Cumbres</span><span aria-hidden="true">·</span><span>Música</span><span aria-hidden="true">·</span><span>Fe</span><span aria-hidden="true">·</span><span>Comunidad</span></footer>
  </div>;
}
