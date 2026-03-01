import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../i18n", () => ({
  default: {
    language: "en",
    t: (key: string) => key,
  },
}));

vi.mock("../../stores/authStore", () => ({
  useAuthStore: {
    getState: () => ({ setAuthenticated: vi.fn() }),
  },
}));

import { apiJson } from "../apiJson";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: string, ok?: boolean) {
  return vi.fn(() =>
    Promise.resolve({
      status,
      ok: ok ?? (status >= 200 && status < 300),
      text: () => Promise.resolve(body),
    } as Response)
  );
}

// ─── apiJson ─────────────────────────────────────────────────────────────────

describe("apiJson", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns parsed JSON on 200", async () => {
    vi.stubGlobal("fetch", mockFetch(200, '{"items":[1,2,3]}'));
    const result = await apiJson<{ items: number[] }>("/api/items");
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it("returns undefined when response body is empty on success", async () => {
    vi.stubGlobal("fetch", mockFetch(200, ""));
    const result = await apiJson<unknown>("/api/items");
    expect(result).toBeUndefined();
  });

  it("throws with message from JSON error response", async () => {
    vi.stubGlobal("fetch", mockFetch(400, '{"message":"Validation failed"}'));
    await expect(apiJson("/api/items")).rejects.toThrow("Validation failed");
  });

  it("throws with error.error field when message absent", async () => {
    vi.stubGlobal("fetch", mockFetch(500, '{"error":"Internal server error"}'));
    await expect(apiJson("/api/items")).rejects.toThrow("Internal server error");
  });

  it("throws with raw text when JSON parse fails on error response", async () => {
    vi.stubGlobal("fetch", mockFetch(503, "Service unavailable"));
    await expect(apiJson("/api/items")).rejects.toThrow("Service unavailable");
  });

  it("throws with i18n fallback when body is empty on error", async () => {
    vi.stubGlobal("fetch", mockFetch(500, ""));
    await expect(apiJson("/api/items")).rejects.toThrow("common.error");
  });

  it("prefers message over error field in JSON error body", async () => {
    vi.stubGlobal("fetch", mockFetch(400, '{"message":"Prefer this","error":"Not this"}'));
    await expect(apiJson("/api/items")).rejects.toThrow("Prefer this");
  });

  it("passes options to the underlying fetch", async () => {
    const fetchMock = mockFetch(200, "null");
    vi.stubGlobal("fetch", fetchMock);

    await apiJson("/api/items", { method: "POST", body: '{"x":1}' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/items"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
