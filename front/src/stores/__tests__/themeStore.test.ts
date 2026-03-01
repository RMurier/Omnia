import { vi, describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "../themeStore";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset store and localStorage before each test
  useThemeStore.setState({ theme: "light" });
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

// ─── toggleTheme ──────────────────────────────────────────────────────────────

describe("themeStore.toggleTheme", () => {
  it("toggles from light to dark", () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("toggles from dark to light", () => {
    useThemeStore.setState({ theme: "dark" });
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("persists theme choice to localStorage", () => {
    useThemeStore.getState().toggleTheme();
    expect(localStorage.getItem("omnia-theme")).toBe("dark");
  });

  it("applies dark class to document root when toggling to dark", () => {
    useThemeStore.getState().toggleTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class from document root when toggling to light", () => {
    useThemeStore.setState({ theme: "dark" });
    document.documentElement.classList.add("dark");
    useThemeStore.getState().toggleTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

// ─── initTheme ────────────────────────────────────────────────────────────────

describe("themeStore.initTheme", () => {
  it("restores dark theme from localStorage", () => {
    localStorage.setItem("omnia-theme", "dark");
    useThemeStore.getState().initTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("restores light theme from localStorage", () => {
    localStorage.setItem("omnia-theme", "light");
    document.documentElement.classList.add("dark");
    useThemeStore.getState().initTheme();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("falls back to OS preference when no stored theme — dark", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    useThemeStore.getState().initTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("falls back to OS preference when no stored theme — light", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    useThemeStore.getState().initTheme();
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("ignores invalid value stored in localStorage", () => {
    localStorage.setItem("omnia-theme", "invalid-value");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    useThemeStore.getState().initTheme();
    // Falls back to OS (light in this case)
    expect(useThemeStore.getState().theme).toBe("light");
  });
});
