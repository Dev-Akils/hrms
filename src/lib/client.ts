"use client";
import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: { path: string; message: string }[]) {
    super(message);
  }
}

// Parallel 401s share a single refresh call
let refreshing: Promise<boolean> | null = null;
const refresh = () =>
  (refreshing ||= fetch("/api/auth/refresh", { method: "POST" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; }));

export async function apiFetch<T = any>(url: string, init: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });

  if (res.status === 401 && retry && !url.startsWith("/api/auth/")) {
    if (await refresh()) return apiFetch<T>(url, init, false);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || "Something went wrong", res.status, data.details);
  return data as T;
}

export const post = <T = any,>(url: string, body?: unknown) =>
  apiFetch<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const patch = <T = any,>(url: string, body: unknown) =>
  apiFetch<T>(url, { method: "PATCH", body: JSON.stringify(body) });

/** Message plus the first field error, e.g. "Validation failed: password: Needs a number" */
export const errText = (e: unknown) => {
  if (e instanceof ApiError) return e.details?.[0] ? `${e.message}: ${e.details[0].path} ${e.details[0].message}` : e.message;
  return "Something went wrong";
};

export type Meta = { page: number; limit: number; total: number; totalPages: number };

/** Loads a paginated list and reloads when the params change. */
export function useList<T = any>(path: string, params: Record<string, string | number>) {
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [extra, setExtra] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const key = JSON.stringify(params);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    Object.entries(JSON.parse(key)).forEach(([k, v]) => v !== "" && qs.set(k, String(v)));
    setLoading(true);
    apiFetch(`${path}?${qs}`)
      .then((r) => { setRows(r.data); setMeta(r.meta); setExtra(r); setError(""); })
      .catch((e) => setError(errText(e)))
      .finally(() => setLoading(false));
  }, [path, key]);

  useEffect(load, [load]);
  return { rows, meta, extra, loading, error, reload: load };
}
