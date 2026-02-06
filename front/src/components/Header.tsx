import React, { useMemo } from "react";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";
import { signout } from "../utils/authFetch";
import { useTranslation } from "react-i18next";
import { Settings, Sun, Moon } from "lucide-react";


type NavItem = {
  label: string;
  href: string;
};

type HeaderProps = {
  isAuthenticated?: boolean;
};

export default function Header({ isAuthenticated = false }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const email = useAuthStore((s) => s.email);
  const name = useAuthStore((s) => s.name);
  const lastName = useAuthStore((s) => s.lastName);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const currentLang = (i18n.language || "en").toLowerCase();
  const isFr = currentLang.startsWith("fr");

  const navItems: NavItem[] = useMemo(
    () => [
      { label: t("nav.applications"), href: "/applications" },
      { label: t("nav.logs"), href: "/logs" },
      { label: t("nav.activity"), href: "/activity" },
    ],
    []
  );

  const displayName = name ? `${name}${lastName ? ` ${lastName}` : ""}` : email;
  const initial = (name?.trim()?.[0] ?? email?.trim()?.[0] ?? "U").toUpperCase();

  const styles: Record<string, React.CSSProperties> = {
    header: {
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      borderBottom: "1px solid var(--color-border)",
      backgroundColor: "var(--color-surface)",
      position: "sticky",
      top: 0,
      zIndex: 50,
    },
    left: { display: "flex", alignItems: "center", gap: 12 },
    logo: {
      fontSize: 18,
      fontWeight: 600,
      color: "var(--color-text-primary)",
      textDecoration: "none",
    },
    nav: { display: "flex", alignItems: "center", gap: 16 },
    list: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      listStyle: "none",
      margin: 0,
      padding: 0,
    },
    link: {
      fontSize: 14,
      color: "var(--color-text-secondary)",
      textDecoration: "none",
    },
    primaryButton: {
      padding: "8px 14px",
      borderRadius: 6,
      border: "none",
      backgroundColor: "var(--color-primary)",
      color: "#ffffff",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 500,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    details: { position: "relative" },
    summary: {
      listStyle: "none",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid var(--color-border-strong)",
      backgroundColor: "var(--color-surface)",
      cursor: "pointer",
      fontSize: 14,
      color: "var(--color-text-primary)",
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      height: 38,
      userSelect: "none",
    },
    dot: {
      width: 28,
      height: 28,
      borderRadius: 999,
      backgroundColor: "var(--color-surface-sunken)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      color: "var(--color-text-secondary)",
      fontSize: 13,
      flex: "0 0 auto",
    },
    caret: {
      width: 0,
      height: 0,
      borderLeft: "5px solid transparent",
      borderRight: "5px solid transparent",
      borderTop: "6px solid var(--color-text-muted)",
      marginLeft: 2,
    },
    menu: {
      position: "absolute",
      right: 0,
      top: "calc(100% + 8px)",
      minWidth: 200,
      borderRadius: 12,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface)",
      boxShadow: "0 10px 28px var(--color-shadow)",
      padding: 8,
      zIndex: 60,
    },
    menuHeader: {
      padding: "8px 10px",
      borderBottom: "1px solid var(--color-surface-sunken)",
      marginBottom: 8,
    },
    menuName: { fontWeight: 900, color: "var(--color-text-primary)", fontSize: 14, margin: 0 },
    menuSub: { color: "var(--color-text-muted)", fontSize: 12, margin: "4px 0 0" },
    itemLink: {
      width: "100%",
      display: "block",
      padding: "10px 10px",
      borderRadius: 10,
      textDecoration: "none",
      color: "var(--color-text-primary)",
      fontWeight: 800,
      fontSize: 14,
    },
    itemBtn: {
      width: "100%",
      display: "block",
      padding: "10px 10px",
      borderRadius: 10,
      border: "1px solid var(--color-error-btn-border)",
      background: "var(--color-error-bg)",
      color: "var(--color-error-btn-text)",
      fontWeight: 800,
      fontSize: 14,
      textAlign: "left",
      cursor: "pointer",
      marginTop: 6,
    },

    /* Settings dropdown */
    settingsBtn: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 38,
      height: 38,
      borderRadius: 999,
      border: "1px solid var(--color-border-strong)",
      backgroundColor: "var(--color-surface)",
      cursor: "pointer",
      padding: 0,
    },
    settingsMenu: {
      position: "absolute",
      right: 0,
      top: "calc(100% + 8px)",
      minWidth: 220,
      borderRadius: 12,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface)",
      boxShadow: "0 10px 28px var(--color-shadow)",
      padding: 10,
      zIndex: 60,
    },
    settingsRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "8px 6px",
    },
    settingsLabel: {
      fontSize: 13,
      fontWeight: 800,
      color: "var(--color-text-primary)",
    },
    themeToggle: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 10,
      border: "1px solid var(--color-border-strong)",
      backgroundColor: "var(--color-surface-raised)",
      cursor: "pointer",
      padding: 0,
    },
    langPill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 0,
      borderRadius: 10,
      border: "1px solid var(--color-border-strong)",
      overflow: "hidden",
    },
    langBtn: {
      padding: "6px 12px",
      border: "none",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 13,
      background: "var(--color-surface)",
      color: "var(--color-text-muted)",
    },
    langBtnActive: {
      background: "var(--color-primary)",
      color: "#ffffff",
    },
  };

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <a href="/" style={styles.logo}>{t("app.name")}</a>
      </div>

      <nav style={styles.nav} aria-label={t("header.mainNav")}>
        <ul style={styles.list}>
          {isAuthenticated && navItems.map((item) => (
            <li key={item.href}>
              <a href={item.href} style={styles.link}>
                {item.label}
              </a>
            </li>
          ))}
          <li>
            <a href="/docs" style={styles.link}>
              {t("nav.docs")}
            </a>
          </li>
        </ul>

        {/* Settings dropdown */}
        <details style={styles.details}>
          <summary style={styles.settingsBtn}>
            <Settings size={18} style={{ color: "var(--color-text-muted)" }} />
          </summary>

          <div style={styles.settingsMenu}>
            {/* Theme toggle */}
            <div style={styles.settingsRow}>
              <span style={styles.settingsLabel}>{t("settings.theme")}</span>
              <button
                type="button"
                style={styles.themeToggle}
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("settings.themeLight") : t("settings.themeDark")}
              >
                {theme === "dark"
                  ? <Sun size={18} style={{ color: "var(--color-warning)" }} />
                  : <Moon size={18} style={{ color: "var(--color-text-muted)" }} />
                }
              </button>
            </div>

            {/* Language selector */}
            <div style={styles.settingsRow}>
              <span style={styles.settingsLabel}>{t("settings.language")}</span>
              <div style={styles.langPill}>
                <button
                  type="button"
                  style={{ ...styles.langBtn, ...(!isFr ? styles.langBtnActive : {}) }}
                  onClick={() => i18n.changeLanguage("en")}
                >
                  EN
                </button>
                <button
                  type="button"
                  style={{ ...styles.langBtn, ...(isFr ? styles.langBtnActive : {}) }}
                  onClick={() => i18n.changeLanguage("fr")}
                >
                  FR
                </button>
              </div>
            </div>
          </div>
        </details>

        {!isAuthenticated ? (
          <a href="/signin" style={styles.primaryButton}>
            {t("header.signin")}
          </a>
        ) : (
          <details style={styles.details}>
            <summary style={styles.summary}>
              <span style={styles.dot}>{initial}</span>
              <span>{displayName ?? t("header.myAccount")}</span>
              <span style={styles.caret} />
            </summary>

            <div style={styles.menu} role="menu" aria-label={t("header.userMenu")}>
              <div style={styles.menuHeader}>
                <p style={styles.menuName}>{displayName ?? t("header.myAccount")}</p>
                <p style={styles.menuSub}>{t("header.manageProfile")}</p>
              </div>

              <a href="/me" style={styles.itemLink} role="menuitem">
                {t("header.profile")}
              </a>

              <button
                type="button"
                style={styles.itemBtn}
                role="menuitem"
                onClick={async () => {
                  await signout();
                  window.location.href = "/signin";
                }}
              >
                {t("header.signoutButton")}
              </button>
            </div>
          </details>
        )}
      </nav>
    </header>
  );
}
