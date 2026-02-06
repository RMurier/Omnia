import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "react-i18next";

type Feature = {
  title: string;
  description: string;
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(Boolean(m.matches));
    onChange();

    if ((m as any).addEventListener) (m as any).addEventListener("change", onChange);
    else (m as any).addListener(onChange);

    return () => {
      if ((m as any).removeEventListener) (m as any).removeEventListener("change", onChange);
      else (m as any).removeListener(onChange);
    };
  }, [query]);

  return matches;
}

function useIsAuthenticated() {
  const { isAuthenticated, hydrateFromServer } = useAuthStore();

  useEffect(() => {
    hydrateFromServer();
  }, [hydrateFromServer]);

  return isAuthenticated;
}

export default function Home() {
  const { t } = useTranslation();
  const isAuthenticated = useIsAuthenticated();
  const isMobile = useMediaQuery("(max-width: 900px)");

  const features: Feature[] = useMemo(
    () => [
      {
        title: t("home.features.centralisationTitle"),
        description: t("home.features.centralisationDesc"),
      },
      {
        title: t("home.features.securityTitle"),
        description: t("home.features.securityDesc"),
      },
      {
        title: t("home.features.adminTitle"),
        description: t("home.features.adminDesc"),
      },
    ],
    [t]
  );

  const from = useMemo(() => {
    if (typeof window === "undefined") return "/";
    return window.location.pathname + window.location.search + window.location.hash;
  }, []);

  const styles: Record<string, React.CSSProperties> = {
    page: { padding: 24, maxWidth: "min(96vw, 1400px)", margin: "0 auto" },
    hero: {
      border: "1px solid var(--color-border)",
      borderRadius: 16,
      background: "var(--color-surface)",
      padding: 22,
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface-raised)",
      color: "var(--color-text-primary)",
      fontSize: 12,
      fontWeight: 800,
      marginBottom: 12,
    },
    title: {
      margin: 0,
      fontSize: 34,
      lineHeight: 1.12,
      letterSpacing: -0.6,
      color: "var(--color-text-primary)",
      fontWeight: 900,
    },
    subtitle: { margin: "10px 0 0", color: "var(--color-text-muted)", fontSize: 15, lineHeight: 1.55 },
    actions: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" },
    btnPrimary: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "none",
      background: "var(--color-primary)",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    btn: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid var(--color-border-strong)",
      background: "var(--color-surface)",
      color: "var(--color-text-primary)",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
      gap: 12,
      marginTop: 16,
    },
    card: {
      border: "1px solid var(--color-border)",
      borderRadius: 14,
      padding: 16,
      background: "var(--color-surface)",
      minWidth: 0,
    },
    cardTitle: { margin: 0, fontSize: 16, fontWeight: 900, color: "var(--color-text-primary)" },
    cardText: { margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: 14, lineHeight: 1.55 },
  };

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.badge}>{t("home.heroTitle")}</div>

        <h1 style={styles.title}>{t("home.heroSubtitle")}</h1>

        <p style={styles.subtitle}>
          {t("home.heroDescription")}
        </p>

        <div style={styles.actions}>
          {!isAuthenticated ? (
            <a href={`/signin?from=${encodeURIComponent(from)}`} style={styles.btnPrimary}>
              {t("home.ctaSignin")}
            </a>
          ) : (
            <a href="/applications" style={styles.btnPrimary}>
              {t("home.ctaApps")}
            </a>
          )}

          <a href="/docs" style={styles.btn}>
            {t("home.ctaDocs")}
          </a>
        </div>

        <div style={styles.grid}>
          {features.map((f) => (
            <div key={f.title} style={styles.card}>
              <h3 style={styles.cardTitle}>{f.title}</h3>
              <p style={styles.cardText}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
