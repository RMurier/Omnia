import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../i18n", () => ({
  default: { language: "en", t: (k: string) => k },
}));

// Provide globalThis.location for auth fetch module
Object.defineProperty(globalThis, "location", {
  value: { pathname: "/app", search: "", hash: "", href: "" },
  writable: true,
  configurable: true,
});

import { useAuthStore } from "../authStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        status,
        ok: status >= 200 && status < 300,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
      } as Response)
    )
  );
}

// ─── setAuthenticated ─────────────────────────────────────────────────────────

describe("authStore.setAuthenticated", () => {
  beforeEach(() => useAuthStore.setState({ isAuthenticated: false, hydrated: false, email: null, name: null, lastName: null }));

  it("sets isAuthenticated to true", () => {
    useAuthStore.getState().setAuthenticated(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("sets isAuthenticated to false", () => {
    useAuthStore.setState({ isAuthenticated: true });
    useAuthStore.getState().setAuthenticated(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// ─── setUser ──────────────────────────────────────────────────────────────────

describe("authStore.setUser", () => {
  beforeEach(() => useAuthStore.setState({ email: null, name: null, lastName: null }));

  it("sets email, name, and lastName", () => {
    useAuthStore.getState().setUser("a@b.com", "John", "Doe");
    const s = useAuthStore.getState();
    expect(s.email).toBe("a@b.com");
    expect(s.name).toBe("John");
    expect(s.lastName).toBe("Doe");
  });

  it("sets null when name/lastName are omitted", () => {
    useAuthStore.getState().setUser("a@b.com");
    const s = useAuthStore.getState();
    expect(s.name).toBeNull();
    expect(s.lastName).toBeNull();
  });

  it("allows clearing user info by passing null", () => {
    useAuthStore.setState({ email: "a@b.com", name: "John", lastName: "Doe" });
    useAuthStore.getState().setUser(null, null, null);
    const s = useAuthStore.getState();
    expect(s.email).toBeNull();
    expect(s.name).toBeNull();
    expect(s.lastName).toBeNull();
  });
});

// ─── hydrateFromServer ────────────────────────────────────────────────────────

describe("authStore.hydrateFromServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: false, hydrated: false, email: null, name: null, lastName: null });
  });

  it("sets isAuthenticated and user data on success", async () => {
    mockFetchOnce(200, { email: "user@test.com", name: "Alice", lastName: "Smith" });

    await useAuthStore.getState().hydrateFromServer();
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.hydrated).toBe(true);
    expect(s.email).toBe("user@test.com");
    expect(s.name).toBe("Alice");
    expect(s.lastName).toBe("Smith");
  });

  it("sets isAuthenticated=false on 401 response", async () => {
    // First fetch returns 401, refresh also 401
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ status: 401, ok: false, text: () => Promise.resolve("") } as Response)
        .mockResolvedValueOnce({ status: 401, ok: false, text: () => Promise.resolve("") } as Response)
    );

    await useAuthStore.getState().hydrateFromServer();
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.hydrated).toBe(true);
  });

  it("sets hydrated=true even on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await useAuthStore.getState().hydrateFromServer();
    expect(useAuthStore.getState().hydrated).toBe(true);
  });
});
