"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* Small data helpers for the browser. Mutations send their "notes" to the toast, and ask
   the header to refresh its XP. */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && location.pathname !== "/") window.location.assign(new URL("/", location.origin));
    throw new ApiError(res.status, (data.error as string) || "Something went wrong. Try again.");
  }
  const method = init?.method ?? (init?.body !== undefined ? "POST" : "GET");
  if (method !== "GET") {
    const notes = (data.notes as string[] | undefined) ?? [];
    if (notes.length) notify(notes);
    window.dispatchEvent(new Event("coach:refresh"));
  }
  return data as T;
}

export function notify(notes: string | string[]) {
  const list = Array.isArray(notes) ? notes : [notes];
  window.dispatchEvent(new CustomEvent("coach:notes", { detail: list }));
}

/**
 * Fetches JSON. Pass pollMs to keep polling while `poll(data)` is true.
 * Every load (also `reload` after "Try again") checks again whether to poll, so polling
 * restarts by itself. A failed poll keeps the last data on screen and retries with a backoff.
 */
export function useApi<T>(url: string | null, opts?: { pollMs?: number; poll?: (d: T) => boolean }) {
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!url);
  const optsRef = useRef(opts);
  const dataRef = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const alive = useRef(true);
  const fails = useRef(0);
  const loadRef = useRef<() => Promise<T | undefined>>(async () => undefined);
  useEffect(() => {
    optsRef.current = opts;
  });

  const setData = useCallback((d: T | null) => {
    dataRef.current = d;
    setDataState(d);
  }, []);

  const load = useCallback(async () => {
    if (!url) return;
    clearTimeout(timer.current);
    let d: T | undefined;
    try {
      d = await api<T>(url);
      fails.current = 0;
      setData(d);
      setError(null);
    } catch (e) {
      fails.current++;
      if (!dataRef.current) setError(e as ApiError);
    } finally {
      setLoading(false);
    }
    const o = optsRef.current;
    const last = d ?? dataRef.current;
    if (alive.current && o?.pollMs && last && o.poll?.(last)) {
      timer.current = setTimeout(() => loadRef.current(), o.pollMs * Math.min(8, 2 ** fails.current));
    }
    return d;
  }, [url, setData]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    alive.current = true;
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- the fetch result arrives later, not during this render
    const onRefresh = () => load();
    window.addEventListener("coach:refresh", onRefresh);
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      window.removeEventListener("coach:refresh", onRefresh);
    };
  }, [load]);

  return { data, error, loading, reload: load, setData };
}

/* True once the player has moved between screens in this page load. After a refresh or a deep link it is false. */
let navigatedInApp = false;
export const markInAppNavigation = () => {
  navigatedInApp = true;
};

/** Back that works after a refresh or a deep link: goes to `fallback` when there is no screen to go back to. */
export function goBack(router: { back: () => void; push: (href: string) => void }, fallback: string) {
  if (navigatedInApp) router.back();
  else router.push(fallback);
}

export const timeAgo = (iso: string | Date) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 864e5);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  if (days < 1 || (days < 2 && new Date(today.getTime() - 864e5).toDateString() === d.toDateString())) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
