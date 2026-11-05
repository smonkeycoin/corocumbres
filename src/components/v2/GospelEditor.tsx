"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import calendar from "@/data/evangelios-dominicales.json";
import { formatSundayDate, getSunday, getTargetSunday, type LiturgicalSunday } from "@/lib/sunday-gospel";
import { Icon } from "./Brand";

type GospelResponse = { record: LiturgicalSunday; etag: string; overridden: boolean };
class GospelRequestError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function requestGospel(date: string, init: RequestInit): Promise<GospelResponse> {
  const response = await fetch(`/api/admin/gospel?date=${encodeURIComponent(date)}`, {
    ...init, cache: "no-store", credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = response.status === 401 ? "Tu sesión terminó. Vuelve a iniciar sesión para editar el título."
      : response.status === 403 ? "Esta cuenta no tiene permiso para editar los evangelios."
      : response.status === 409 || response.status === 412 ? "Otro administrador guardó cambios. Tu texto sigue aquí; carga la versión actual antes de volver a guardar."
      : typeof result.error === "string" ? result.error : "No fue posible cargar o guardar el título. Inténtalo de nuevo.";
    throw new GospelRequestError(response.status, message);
  }
  return result as GospelResponse;
}

export function GospelEditor() {
  const [date, setDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const target = getTargetSunday(new Date());
    setDate(getSunday(target) ? target : calendar[0].sunday_date);
  }, []);

  return <section className="admin-panel admin-gospel-editor" aria-labelledby="gospel-editor-heading">
    <Icon name="edit" size={28} />
    <h2 id="gospel-editor-heading">Evangelio dominical</h2>
    <p>Edita el título que aparece en el portal. El domingo correspondiente cambia automáticamente según la fecha de Cancún.</p>
    <div className="admin-gospel-date">
      <label htmlFor="gospel-sunday">Domingo</label>
      <select id="gospel-sunday" value={date ?? ""} disabled={!date || saving} onChange={(event) => {
        if (dirty && !window.confirm("Tienes un título sin guardar. ¿Quieres cambiar de domingo y descartar esos cambios?")) return;
        setDirty(false); setDate(event.target.value);
      }}>
        {!date ? <option value="">Preparando calendario…</option> : null}
        {[2026, 2027, 2028].map((year) => <optgroup key={year} label={String(year)}>
          {calendar.filter((record) => record.sunday_date.startsWith(String(year))).map((record) => <option key={record.sunday_date} value={record.sunday_date}>{formatSundayDate(record.sunday_date)} · {record.celebration}</option>)}
        </optgroup>)}
      </select>
    </div>
    {date ? <GospelTitleForm key={date} date={date} onSavingChange={setSaving} onDirtyChange={setDirty} /> : <p role="status">Preparando el calendario…</p>}
  </section>;
}

function GospelTitleForm({ date, onSavingChange, onDirtyChange }: { date: string; onSavingChange: (saving: boolean) => void; onDirtyChange: (dirty: boolean) => void }) {
  const [data, setData] = useState<GospelResponse | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const saveRequest = useRef<AbortController | null>(null);
  const trimmedTitle = title.trim();
  const dirty = Boolean(data && trimmedTitle !== data.record.short_title);
  const blocked = errorStatus === 401 || errorStatus === 403 || errorStatus === 409 || errorStatus === 412;

  useEffect(() => {
    const controller = new AbortController();
    void requestGospel(date, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setData(result); setTitle(result.record.short_title); setLoading(false); onDirtyChange(false);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "No pudimos cargar el evangelio.");
      setErrorStatus(cause instanceof GospelRequestError ? cause.status : null); setLoading(false);
    });
    return () => controller.abort();
  }, [date, reload, onDirtyChange]);

  useEffect(() => () => saveRequest.current?.abort(), []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || loading || saving || blocked || !dirty || !trimmedTitle || trimmedTitle.length > 100) return;
    const controller = new AbortController();
    saveRequest.current = controller;
    setSaving(true); onSavingChange(true); setError(""); setErrorStatus(null); setNotice("");
    try {
      const result = await requestGospel(date, {
        method: "PUT", signal: controller.signal,
        body: JSON.stringify({ sunday_date: date, short_title: trimmedTitle, etag: data.etag }),
      });
      if (controller.signal.aborted) return;
      setData(result); setTitle(result.record.short_title); onDirtyChange(false);
      setNotice("Título guardado. Ya está disponible en el portal.");
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el título.");
      setErrorStatus(cause instanceof GospelRequestError ? cause.status : null);
    } finally {
      if (!controller.signal.aborted) { setSaving(false); onSavingChange(false); saveRequest.current = null; }
    }
  }

  function reloadTitle() {
    if (dirty && !window.confirm("Cargar la versión actual reemplazará el título que tienes sin guardar. ¿Quieres continuar?")) return;
    setLoading(true); setError(""); setErrorStatus(null); setNotice(""); setReload((value) => value + 1);
  }

  return <form className="admin-gospel-form" onSubmit={(event) => void save(event)} aria-busy={loading || saving}>
    {loading ? <p className="admin-small" role="status">Cargando el título guardado…</p> : null}
    {data ? <>
      <dl className="admin-gospel-details">
        <div><dt>Celebración</dt><dd>{data.record.celebration}</dd></div>
        <div><dt>Año litúrgico y ciclo</dt><dd>{data.record.liturgical_year} · Ciclo {data.record.cycle}</dd></div>
        <div><dt>Evangelio</dt><dd>{data.record.gospel_reference}</dd></div>
      </dl>
      <label htmlFor="gospel-short-title">Título corto
        <input id="gospel-short-title" value={title} required maxLength={100} disabled={loading || saving || errorStatus === 401 || errorStatus === 403} aria-describedby="gospel-title-help" onChange={(event) => {
          setTitle(event.target.value); setNotice(""); onDirtyChange(event.target.value.trim() !== data.record.short_title);
        }} />
      </label>
      <p id="gospel-title-help" className="admin-small">{title.length}/100 caracteres · La fecha, la referencia y el ciclo se conservan.</p>
      <div className="admin-actions">
        <button className="v2-button primary" type="submit" disabled={loading || saving || blocked || !dirty || !trimmedTitle || trimmedTitle.length > 100}>{saving ? "Guardando…" : "Guardar título"}</button>
        <span className={`admin-status ${dirty ? "pending" : ""}`}>{dirty ? "Título sin guardar" : data.overridden ? "Título personalizado" : "Título del calendario"}</span>
      </div>
    </> : null}
    <div aria-live="polite">
      {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
      {error ? <div className="admin-error" role="alert"><p>{error}</p><div className="admin-actions">
        {errorStatus === 401 ? <Link className="v2-button secondary" href="/login">Iniciar sesión</Link> : <button className="v2-button secondary" type="button" disabled={loading || saving} onClick={reloadTitle}>{data ? "Cargar versión actual" : "Reintentar"}</button>}
      </div></div> : null}
    </div>
  </form>;
}
