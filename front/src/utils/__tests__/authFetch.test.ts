import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ─── Mock dependencies before importing the module ──────────────────────────

const mockSetAuthenticated = vi.fn();

vi.mock("../../stores/authStore", () => ({
  useAuthStore: {
    getState: () => ({ setAuthenticated: mockSetAuthenticated }),
  },
}));

vi.mock("../../i18n", () => ({
  default: {
    language: "en",
    t: (key: string) => key,
  },
}));

// Must import AFTER mocks
import { authFetchResponse, authFetch, apiFetch, signin, signout } from "../authFetch";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(responses: { status: number; body?: string; ok?: boolean }[]) {
  let call = 0;
  return vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => {
    const r = responses[call] ?? responses[responses.length - 1];
    call++;
    const ok = r.ok ?? (r.status >= 200 && r.status < 300);
    return Promise.resolve({
      status: r.status,
      ok,
      text: () => Promise.resolve(r.body ?? ""),
    } as Response);
  });
}

// ─── authFetchResponse ────────────────────────────────────────────────────────

describe("authFetchResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub globalThis.location
    Object.defineProperty(globalThis, "location", {
      value: { pathname: "/app", search: "", hash: "", href: "" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns response immediately when status is not 401", async () => {
    const fetchMock = mockFetch([{ status: 200, body: '{"ok":true}' }]);
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetchResponse("/some/path");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 immediately without retrying", async () => {
    const fetchMock = mockFetch([{ status: 404, body: "Not found" }]);
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetchResponse("/some/path");
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries after successful refresh on 401", async () => {
    const fetchMock = mockFetch([
      { status: 401 },          // first request
      { status: 200 },          // refresh succeeds
      { status: 200, body: "[]" }, // retry succeeds
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetchResponse("/api/logs");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("marks user as authenticated after successful retry", async () => {
    const fetchMock = mockFetch([
      { status: 401 },
      { status: 200 },
      { status: 200 },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await authFetchResponse("/api/logs");
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
  });

  it("marks user unauthenticated and redirects when refresh fails", async () => {
    const fetchMock = mockFetch([
      { status: 401 },
      { status: 401 }, // refresh fails
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await authFetchResponse("/api/logs");
    expect(mockSetAuthenticated).toHaveBeenCalledWith(false);
  });

  it("does not redirect for /auth/login path on 401", async () => {
    const fetchMock = mockFetch([{ status: 401 }, { status: 401 }]);
    vi.stubGlobal("fetch", fetchMock);
    const locationBefore = globalThis.location.href;

    await authFetchResponse("/auth/login");
    expect(globalThis.location.href).toBe(locationBefore);
  });

  it("does not redirect for /auth/register path on 401", async () => {
    const fetchMock = mockFetch([{ status: 401 }, { status: 401 }]);
    vi.stubGlobal("fetch", fetchMock);
    const locationBefore = globalThis.location.href;

    await authFetchResponse("/auth/register");
    expect(globalThis.location.href).toBe(locationBefore);
  });

  it("does not redirect when noRedirect option is set", async () => {
    const fetchMock = mockFetch([{ status: 401 }, { status: 401 }]);
    vi.stubGlobal("fetch", fetchMock);
    const locationBefore = globalThis.location.href;

    await authFetchResponse("/api/anything", { noRedirect: true });
    expect(globalThis.location.href).toBe(locationBefore);
  });

  it("does not retry on /auth/refresh path itself", async () => {
    const fetchMock = mockFetch([{ status: 401 }]);
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetchResponse("/auth/refresh");
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("adds Accept-Language header from i18n", async () => {
    const fetchMock = mockFetch([{ status: 200 }]);
    vi.stubGlobal("fetch", fetchMock);

    await authFetchResponse("/api/data");
    const callHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(callHeaders.get("Accept-Language")).toBe("en");
  });

  it("adds Content-Type for string body", async () => {
    const fetchMock = mockFetch([{ status: 200 }]);
    vi.stubGlobal("fetch", fetchMock);

    await authFetchResponse("/api/data", {
      method: "POST",
      body: JSON.stringify({ foo: "bar" }),
    });
    const callHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(callHeaders.get("Content-Type")).toBe("application/json");
  });

  it("does not override existing Content-Type header", async () => {
    const fetchMock = mockFetch([{ status: 200 }]);
    vi.stubGlobal("fetch", fetchMock);

    await authFetchResponse("/api/data", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "raw text",
    });
    const callHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(callHeaders.get("Content-Type")).toBe("text/plain");
  });
});

// ─── authFetch ────────────────────────────────────────────────────────────────

describe("authFetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", mockFetch([{ status: 200, body: '{"id":1}' }]));
    const result = await authFetch<{ id: number }>("/api/item");
    expect(result).toEqual({ id: 1 });
  });

  it("returns undefined for empty successful response", async () => {
    vi.stubGlobal("fetch", mockFetch([{ status: 200, body: "" }]));
    const result = await authFetch<unknown>("/api/item");
    expect(result).toBeUndefined();
  });

  it("throws on error response", async () => {
    vi.stubGlobal("fetch", mockFetch([{ status: 400, body: '{"message":"Bad input"}' }]));
    await expect(authFetch("/api/item")).rejects.toThrow("Bad input");
  });

  it("throws with error.error field when message absent", async () => {
    vi.stubGlobal("fetch", mockFetch([{ status: 500, body: '{"error":"Server crashed"}' }]));
    await expect(authFetch("/api/item")).rejects.toThrow("Server crashed");
  });
});

// ─── apiFetch ─────────────────────────────────────────────────────────────────

describe("apiFetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns parsed JSON on success without going through auth", async () => {
    const fetchMock = mockFetch([{ status: 200, body: '{"public":true}' }]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ public: boolean }>("/auth/status");
    expect(result).toEqual({ public: true });
    // Only 1 call — no refresh attempt
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch([{ status: 403, body: '{"message":"Forbidden"}' }]));
    await expect(apiFetch("/auth/status")).rejects.toThrow("Forbidden");
  });
});

// ─── signin ───────────────────────────────────────────────────────────────────

describe("signin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "location", {
      value: { pathname: "/signin", search: "", hash: "", href: "" },
      writable: true,
      configurable: true,
    });
  });

  it("calls setAuthenticated(true) on success", async () => {
    vi.stubGlobal("fetch", mockFetch([{ status: 200 }]));
    await signin("user@example.com", "password");
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
  });

  it("throws on failed login", async () => {
    vi.stubGlobal("fetch", mockFetch([{ status: 401, body: '{"message":"Invalid credentials"}' }]));
    await expect(signin("user@example.com", "wrong")).rejects.toThrow("Invalid credentials");
  });
});

// ─── signout ──────────────────────────────────────────────────────────────────

describe("signout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls setAuthenticated(false) after signout", async () => {
    vi.stubGlobal("fetch", mockFetch([{ status: 200 }]));
    await signout();
    expect(mockSetAuthenticated).toHaveBeenCalledWith(false);
  });
});
