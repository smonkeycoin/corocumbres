"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Brand, GoogleMark, Icon } from "./Brand";
import { PublicFooter } from "./PublicPortal";

function errorMessage(error?: string) {
  if (!error) return null;
  if (error === "AccessDenied") return "Esta cuenta no tiene acceso administrativo. Inicia sesión con una cuenta autorizada por el coro.";
  if (error === "SessionRequired") return "Inicia sesión con tu cuenta autorizada para continuar.";
  return "No pudimos completar el inicio de sesión. Inténtalo de nuevo con tu cuenta de Google.";
}

export function LoginPanel({ ready, error }: { ready: boolean; error?: string }) {
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const message = requestError ?? errorMessage(error);

  async function login() {
    if (!ready || busy) return;
    setBusy(true);
    setRequestError(null);
    try {
      await signIn("google", { callbackUrl: "/admin" });
    } catch {
      setRequestError("No pudimos conectar con Google. Revisa tu conexión e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return <div className="v2-app v2-login-app">
    <main className="v2-login-main">
      <Link href="/" className="v2-back-link v2-login-back"><Icon name="arrow-left" size={18} />Volver al portal</Link>
      <section className="v2-login-card" aria-labelledby="login-title">
        <div className="v2-login-brand"><Brand /></div>
        <h1 id="login-title">Acceso para administradores</h1>
        <p className="v2-login-description">Inicia sesión con tu cuenta de Google para gestionar las playlists y el repertorio del coro.</p>
        {message ? <div className="v2-login-error" role="alert"><Icon name="info" size={18} /><p>{message}</p></div> : null}
        <button type="button" className="v2-google-button" onClick={login} disabled={!ready || busy} aria-busy={busy} aria-describedby={!ready ? "login-status" : undefined}><GoogleMark /><span>{busy ? "Conectando con Google…" : "Iniciar sesión con Google"}</span></button>
        {!ready ? <p id="login-status" className="v2-login-status">El acceso administrativo se está preparando. Mientras tanto, puedes consultar las canciones de tu misa en el portal.</p> : null}
        <p className="v2-login-restriction"><Icon name="lock" size={14} /><span>Solo los administradores autorizados del coro<br className="v2-login-break" /> pueden acceder a esta sección.</span></p>
        <svg className="v2-login-mountains" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true"><path d="m0 55 25-10 27 7 32-30 47 40 41-2 59 25 51-24 35 20 64-49 54 49 51-33 23 5 49-41 72 47 45 10v31H0Z" fill="#edf1f6" /><path d="m0 59 29-7 30 14 34-18 62 26 50-7 68 26 46-15 66-49 51 43 55-25 66 34 43-6v25H0Z" fill="#e1e8f1" /><path d="m0 69 35-22 38 10 26-13 61 39 43-8 48 25h-251Zm342 31 79-65 19 14 20-5 76 43 64-17v30Z" fill="#d2dce9" /><path d="m399 53 22-18 19 14 20-5-20 12-18-10Z" fill="#f6f8fb" /></svg>
      </section>
      <p className="v2-login-public-link">¿Vienes a cantar? <Link href="/">Encuentra tu misa<Icon name="arrow-right" size={15} /></Link></p>
    </main>
    <PublicFooter />
  </div>;
}
