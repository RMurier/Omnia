import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { BREAKPOINTS } from "../../hooks/breakpoints";

import GettingStartedIndex from "./GettingStarted";
import CoreConceptsIndex from "./CoreConcepts";
import ApiReferenceIndex from "./ApiReference";
import IntegrationIndex from "./Integration";
import BestPracticesIndex from "./BestPractices";
import TroubleshootingIndex from "./Troubleshooting";
import FaqIndex from "./Faq";

type Category = {
  key: string;
  labelKey: string;
  component: React.ComponentType;
  sections: { id: string; labelKey: string }[];
};

const categories: Category[] = [
  {
    key: "getting-started",
    labelKey: "docs.categories.gettingStarted",
    component: GettingStartedIndex,
    sections: [
      { id: "introduction", labelKey: "docs.gettingStarted.introduction" },
      { id: "quick-start", labelKey: "docs.gettingStarted.quickStart" },
      { id: "prerequisites", labelKey: "docs.gettingStarted.prerequisites" },
    ],
  },
  {
    key: "core-concepts",
    labelKey: "docs.categories.coreConcepts",
    component: CoreConceptsIndex,
    sections: [
      { id: "applications", labelKey: "docs.coreConcepts.applications" },
      { id: "authentication", labelKey: "docs.coreConcepts.authentication" },
      { id: "hmac-signing", labelKey: "docs.coreConcepts.hmacSigning" },
      { id: "logs", labelKey: "docs.coreConcepts.logs" },
      { id: "activity", labelKey: "docs.coreConcepts.activity" },
    ],
  },
  {
    key: "api-reference",
    labelKey: "docs.categories.apiReference",
    component: ApiReferenceIndex,
    sections: [
      { id: "application-endpoints", labelKey: "docs.apiReference.applicationEndpoints" },
      { id: "log-endpoints", labelKey: "docs.apiReference.logEndpoints" },
      { id: "activity-endpoints", labelKey: "docs.apiReference.activityEndpoints" },
    ],
  },
  {
    key: "integration",
    labelKey: "docs.categories.integration",
    component: IntegrationIndex,
    sections: [
      { id: "csharp", labelKey: "docs.integration.csharp" },
      { id: "react-native", labelKey: "docs.integration.reactNative" },
      { id: "nextjs", labelKey: "docs.integration.nextjs" },
      { id: "express", labelKey: "docs.integration.express" },
      { id: "python", labelKey: "docs.integration.python" },
      { id: "go", labelKey: "docs.integration.go" },
      { id: "php", labelKey: "docs.integration.php" },
    ],
  },
  {
    key: "best-practices",
    labelKey: "docs.categories.bestPractices",
    component: BestPracticesIndex,
    sections: [
      { id: "secret-management", labelKey: "docs.bestPractices.secretManagement" },
      { id: "error-handling", labelKey: "docs.bestPractices.errorHandling" },
      { id: "log-structure", labelKey: "docs.bestPractices.logStructure" },
    ],
  },
  {
    key: "troubleshooting",
    labelKey: "docs.categories.troubleshooting",
    component: TroubleshootingIndex,
    sections: [
      { id: "auth-errors", labelKey: "docs.troubleshooting.authErrors" },
      { id: "hmac-errors", labelKey: "docs.troubleshooting.hmacErrors" },
      { id: "common-issues", labelKey: "docs.troubleshooting.commonIssues" },
    ],
  },
  {
    key: "faq",
    labelKey: "docs.categories.faq",
    component: FaqIndex,
    sections: [
      { id: "general", labelKey: "docs.faq.general" },
      { id: "security", labelKey: "docs.faq.security" },
      { id: "pricing", labelKey: "docs.faq.pricing" },
    ],
  },
];

export default function Documentation() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState(categories[0].key);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentCategory = categories.find((c) => c.key === activeCategory) ?? categories[0];
  const CategoryComponent = currentCategory.component;

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (isTablet) setSidebarOpen(false);
  };

  const onCategoryClick = (key: string) => {
    setActiveCategory(key);
    if (isTablet) setSidebarOpen(false);
  };

  const navBtnStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    textAlign: "left",
    padding: "10px 20px",
    border: "none",
    borderLeft: active ? "3px solid var(--color-sidebar-active-border)" : "3px solid transparent",
    background: active ? "var(--color-sidebar-active-bg)" : "transparent",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    color: active ? "var(--color-sidebar-active-text)" : "var(--color-text-secondary)",
  });

  const sidebarStyle: React.CSSProperties = isTablet
    ? {
        position: "fixed",
        top: 64,
        left: 0,
        bottom: 0,
        width: 280,
        zIndex: 40,
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        overflowY: "auto",
        padding: "24px 0",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.2s ease",
      }
    : {
        position: "sticky",
        top: 64,
        height: "calc(100vh - 64px)",
        width: 280,
        flexShrink: 0,
        alignSelf: "flex-start",
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        overflowY: "auto",
        padding: "24px 0",
      };

  return (
    <div style={{ display: "flex", flex: 1, background: "var(--color-surface-sunken)" }}>
      {isTablet && sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "var(--color-overlay)", zIndex: 39 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside style={sidebarStyle}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--color-text-muted)", padding: "0 20px", marginBottom: 12 }}>
          {t("docs.navigation")}
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {categories.map((cat) => (
            <li key={cat.key}>
              <button style={navBtnStyle(activeCategory === cat.key)} onClick={() => onCategoryClick(cat.key)} type="button">
                {t(cat.labelKey)}
              </button>
              {activeCategory === cat.key && (
                <ul style={{ listStyle: "none", margin: 0, padding: "4px 0 8px 32px" }}>
                  {cat.sections.map((sec) => (
                    <li key={sec.id}>
                      <button
                        style={{ width: "100%", textAlign: "left", padding: "6px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-muted)", borderRadius: 4 }}
                        onClick={() => scrollToSection(sec.id)}
                        type="button"
                      >
                        {t(sec.labelKey)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {isTablet && (
        <button
          type="button"
          style={{ position: "fixed", bottom: 20, left: 16, zIndex: 41, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 14, border: "none", background: "var(--color-primary)", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", cursor: "pointer" }}
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={t("docs.toggleSidebar")}
        >
          {sidebarOpen ? <X size={22} style={{ color: "#fff" }} /> : <Menu size={22} style={{ color: "#fff" }} />}
        </button>
      )}

      <main style={{ flex: 1, padding: isTablet ? "24px 16px" : "32px 48px", maxWidth: 900 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 8px" }}>{t("docs.title")}</h1>
        <p style={{ fontSize: 15, color: "var(--color-text-muted)", marginBottom: 32 }}>{t("docs.subtitle")}</p>
        <CategoryComponent />
      </main>
    </div>
  );
}
