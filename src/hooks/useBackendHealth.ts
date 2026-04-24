import { useEffect, useRef, useState } from "react";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://nexusedu-backend-0bjq.onrender.com";

export type TelegramState = "connected" | "reconnecting" | "disconnected" | "unknown";

export interface BackendHealth {
  ok: boolean;
  telegram: TelegramState;
  raw?: any;
}

/**
 * Polls the FastAPI backend `/health` endpoint with an exact 8000ms timeout
 * per request. Tracks consecutive failures so the UI can render a 3-state
 * indicator (orange "starting" → red "offline" only after 5+ failures).
 */
export function useBackendHealth(intervalMs = 30_000) {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [failures, setFailures] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const timer = useRef<number | null>(null);

  const fetchBackendHealth = async (): Promise<BackendHealth | null> => {
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), 8000); // exact 8000ms
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      if (!res.ok) throw new Error(`status_${res.status}`);
      const data = await res.json().catch(() => ({}));
      const telegram: TelegramState =
        data?.telegram === "connected" || data?.telegram === "reconnecting"
          ? data.telegram
          : data?.telegram === "disconnected"
          ? "disconnected"
          : "unknown";
      return { ok: true, telegram, raw: data };
    } catch {
      return null;
    } finally {
      window.clearTimeout(t);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      setIsFetching(true);
      const result = await fetchBackendHealth();
      if (cancelled) return;
      if (result) {
        setHealth(result);
        setFailures(0);
      } else {
        setFailures((n) => n + 1);
      }
      setIsFetching(false);
    };
    tick();
    timer.current = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [intervalMs]);

  // Derive UI state per spec
  let color: "green" | "orange" | "red" = "orange";
  let label = "সার্ভার চালু হচ্ছে...";
  if (failures >= 5) {
    color = "red";
    label = "সার্ভার অফলাইন";
  } else if (health?.telegram === "connected") {
    color = "green";
    label = "সার্ভার অনলাইন";
  } else if (health?.telegram === "reconnecting") {
    color = "orange";
    label = "সার্ভার রিকানেক্ট করছে...";
  }

  return { health, failures, isFetching, color, label };
}
