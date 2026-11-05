"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  formatSundayDate, getCancunDate, getSunday, getSundayDateForLocalDay,
  GOSPEL_FALLBACK, millisecondsUntilCancunMidnight, type PublicGospel,
} from "@/lib/sunday-gospel";

function subscribeToCancunDay(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function refresh() {
    clearTimeout(timer);
    onChange();
    // Recheck clock adjustments at least once a minute; hit midnight precisely.
    timer = setTimeout(refresh, Math.min(60_000, millisecondsUntilCancunMidnight() + 20));
  }
  refresh();
  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    window.removeEventListener("pageshow", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

export function SundayGospel({ initialToday, initialGospel }: { initialToday: string; initialGospel: PublicGospel }) {
  // The serialized server day is also used by the first client render, even at midnight.
  const today = useSyncExternalStore(subscribeToCancunDay, getCancunDate, () => initialToday);
  const sundayDate = getSundayDateForLocalDay(today);
  const [editorial, setEditorial] = useState(initialGospel);
  const title = editorial.sunday_date === sundayDate ? editorial.short_title : getSunday(sundayDate)?.short_title;

  useEffect(() => {
    let controller: AbortController | undefined;
    async function refreshTitle() {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const response = await fetch(`/api/public/gospel?date=${sundayDate}`, { cache: "no-store", signal });
        if (!response.ok) return;
        const data: PublicGospel = await response.json();
        if (!signal.aborted && data.sunday_date === sundayDate &&
          (data.short_title === null || (typeof data.short_title === "string" && data.short_title.length <= 100))) {
          setEditorial(data);
        }
      } catch { /* The verified local calendar remains available offline. */ }
    }
    function onVisible() {
      if (document.visibilityState === "visible") void refreshTitle();
    }
    void refreshTitle();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sundayDate]);

  return <div className="v2-sunday-gospel" aria-live="polite" aria-atomic="true" data-sunday={sundayDate}>
    <p className="v2-gospel-label">
      <span>{today === sundayDate ? "EVANGELIO DE HOY" : "EVANGELIO DEL PRÓXIMO DOMINGO"}</span>
      <span aria-hidden="true"> · </span><time dateTime={sundayDate}>{formatSundayDate(sundayDate)}</time>
    </p>
    <p className="v2-gospel-title">{title || GOSPEL_FALLBACK}</p>
  </div>;
}
