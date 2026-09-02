"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";

export function EventCountdown({ date, startsAt, locale }: { date: string; startsAt: string | null; locale: Locale }) {
  const target = useMemo(() => {
    if (startsAt) return new Date(startsAt).getTime();
    return new Date(`${date}T00:00:00`).getTime();
  }, [date, startsAt]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const pt = locale === "pt-BR";
  if (now === null) return <span aria-live="polite">{pt ? "Começa em —" : "Starts in —"}</span>;

  const diff = Math.max(0, target - now);
  if (diff <= 0) return <span aria-live="polite">{pt ? "Evento iniciado" : "Event started"}</span>;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span aria-live="polite">
      {pt ? "Começa em" : "Starts in"} {days}d {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
    </span>
  );
}
