import { useAuthStore } from "../stores/authStore";
import i18n from "../i18n";

const API_BASE_URL = "/api";
const REFRESH_PATH = "/auth/refresh";

function isOnSigninPage() {
  const p = globalThis.location.pathname || "";
  return p === "/signin" || p.startsWith("/signin/");
}

function redirectToSignin() {
  if (isOnSigninPage()) return;

  const from = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;
  globalThis.location.href = `/signin?from=${encodeURIComponent(from)}`;
}

function buildHeaders(options: RequestInit | undefined) {
  const h = new Headers(options?.headers);

  const lng = i18n?.language || "en";
  if (!h.has("Accept-Language")) {
    h.set("Accept-Language", lng);
  }

  const hasBody = options?.body !== undefined && options?.body !== null;
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && options?.body instanceof Blob;
  const isArrayBuffer =
    typeof ArrayBuffer !== "undefined" &&
    (options?.body instanceof ArrayBuffer || ArrayBuffer.isView(options?.body as any));
  const isString = typeof options?.body === "string";

  if (hasBody && !h.has("Content-Type") && !isFormData && !isBlob && !isArrayBuffer && isString) {
    h.set("Content-Type", "application/json");
  }

  return h;
}

async function rawFetch(path: string, options: RequestInit = {}) {
  const headers = buildHeaders(options);

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
}

async function tryRefreshCookieSession(): Promise<boolean> {
  const res = await rawFetch(REFRESH_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return res.ok;
}

type AuthFetchOptions = RequestInit & {
  noRedirect?: boolean;
};

function shouldSuppressRedirect(path: string, opts?: AuthFetchOptions) {
  if (opts?.noRedirect) return true;
  if (path === "/auth/me") return true;
  if (path === "/auth/login") return true;
  if (path === "/auth/register") return true;
  if (path === REFRESH_PATH) return true;
  return false;
}

export async function authFetchResponse(path: string, options: AuthFetchOptions = {}): Promise<Response> {
  const first = await rawFetch(path, options);
  if (first.status !== 401) return first;

  if (path === REFRESH_PATH) return first;

  const refreshed = await tryRefreshCookieSession();
  if (!refreshed) {
    useAuthStore.getState().setAuthenticated(false);

    if (!shouldSuppressRedirect(path, options)) {
      redirectToSignin();
    }

    return first;
  }

  const retry = await rawFetch(path, options);
  if (retry.status === 401) {
    useAuthStore.getState().setAuthenticated(false);

    if (!shouldSuppressRedirect(path, options)) {
      redirectToSignin();
    }
  } else {
    useAuthStore.getState().setAuthenticated(true);
  }

  return retry;
}

export async function authFetch<T>(path: string, options: AuthFetchOptions = {}): Promise<T> {
  const res = await authFetchResponse(path, options);

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let msg = raw || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      msg = j?.message || j?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const text = await res.text().catch(() => "");
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await rawFetch(path, options);

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let msg = raw || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      msg = j?.message || j?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const text = await res.text().catch(() => "");
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function signin(email: string, password: string): Promise<void> {
  const res = await rawFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let msg = raw || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      msg = j?.message || j?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  useAuthStore.getState().setAuthenticated(true);
}

export async function signout(): Promise<void> {
  await rawFetch("/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  useAuthStore.getState().setAuthenticated(false);
}
