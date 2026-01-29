import React, { useMemo } from "react";
import { useAuthStore } from "../stores/authStore";
import { signout } from "../utils/authFetch";
import { useTranslation } from "react-i18next";


type NavItem = {
  label: string;
  href: string;
};

type HeaderProps = {
  isAuthenticated?: boolean;
};

export default function Header({ isAuthenticated = false }: HeaderProps) {
  const { t } = useTranslation();
  const email = useAuthStore((s) => s.email);
  const name = useAuthStore((s) => s.name);
  const lastName = useAuthStore((s) => s.lastName);

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
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      position: "sticky",
      top: 0,
      zIndex: 50,
    },
    left: { display: "flex", alignItems: "center", gap: 12 },
    logo: {
      fontSize: 18,
      fontWeight: 600,
      color: "#111827",
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
      color: "#374151",
      textDecoration: "none",
    },
    primaryButton: {
      padding: "8px 14px",
      borderRadius: 6,
      border: "none",
      backgroundColor: "#6366f1",
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
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      fontSize: 14,
      color: "#111827",
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
      backgroundColor: "#f3f4f6",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      color: "#374151",
      fontSize: 13,
      flex: "0 0 auto",
    },
    caret: {
      width: 0,
      height: 0,
      borderLeft: "5px solid transparent",
      borderRight: "5px solid transparent",
      borderTop: "6px solid #6b7280",
      marginLeft: 2,
    },
    menu: {
      position: "absolute",
      right: 0,
      top: "calc(100% + 8px)",
      minWidth: 200,
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
      padding: 8,
      zIndex: 60,
    },
    menuHeader: {
      padding: "8px 10px",
      borderBottom: "1px solid #f3f4f6",
      marginBottom: 8,
    },
    menuName: { fontWeight: 900, color: "#111827", fontSize: 14, margin: 0 },
    menuSub: { color: "#6b7280", fontSize: 12, margin: "4px 0 0" },
    itemLink: {
      width: "100%",
      display: "block",
      padding: "10px 10px",
      borderRadius: 10,
      textDecoration: "none",
      color: "#111827",
      fontWeight: 800,
      fontSize: 14,
    },
    itemBtn: {
      width: "100%",
      display: "block",
      padding: "10px 10px",
      borderRadius: 10,
      border: "1px solid #fee2e2",
      background: "#fef2f2",
      color: "#991b1b",
      fontWeight: 800,
      fontSize: 14,
      textAlign: "left",
      cursor: "pointer",
      marginTop: 6,
    },
  };

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <a href="/" style={styles.logo}>{t("app.name")}</a>
      </div>

      <nav style={styles.nav} aria-label={t("header.mainNav")}>
        {isAuthenticated && (
          <ul style={styles.list}>
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href} style={styles.link}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        )}

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