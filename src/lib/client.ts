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

/** Fetches JSON. Pass pollMs to keep polling while `poll(data)` is true. */
export function useApi<T>(url: string | null, opts?: { pollMs?: number; poll?: (d: T) => boolean }) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!url);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const load = useCallback(async () => {
    if (!url) return;
    try {
      const d = await api<T>(url);
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const tick = async () => {
      const d = await load();
      const o = optsRef.current;
      if (alive && o?.pollMs && d && o.poll?.(d)) timer = setTimeout(tick, o.pollMs);
    };
    tick();
    const onRefresh = () => load();
    window.addEventListener("coach:refresh", onRefresh);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("coach:refresh", onRefresh);
    };
  }, [load]);

  return { data, error, loading, reload: load, setData };
}

export const timeAgo = (iso: string | Date) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 864e5);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  if (days < 1 || (days < 2 && new Date(today.getTime() - 864e5).toDateString() === d.toDateString())) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
