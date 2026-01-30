import React, { useState } from "react";
import { useTranslation } from "react-i18next";

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
      { id: "auth-endpoints", labelKey: "docs.apiReference.authEndpoints" },
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

  const currentCategory = categories.find((c) => c.key === activeCategory) ?? categories[0];
  const CategoryComponent = currentCategory.component;

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    page: {
      display: "flex",
      minHeight: "calc(100vh - 64px)",
      background: "#f9fafb",
    },
    sidebar: {
      width: 280,
      minWidth: 280,
      background: "#fff",
      borderRight: "1px solid #e5e7eb",
      padding: "24px 0",
      position: "sticky",
      top: "64px",
      height: "calc(100vh - 64px)",
      overflowY: "auto",
    },
    sidebarTitle: {
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: "#6b7280",
      padding: "0 20px",
      marginBottom: 12,
    },
    categoryList: {
      listStyle: "none",
      margin: 0,
      padding: 0,
    },
    categoryItem: {
      marginBottom: 4,
    },
    categoryBtn: {
      width: "100%",
      textAlign: "left",
      padding: "10px 20px",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
      color: "#374151",
      transition: "background 0.15s, color 0.15s",
    },
    categoryBtnActive: {
      background: "#eef2ff",
      color: "#4f46e5",
      borderLeft: "3px solid #4f46e5",
    },
    sectionList: {
      listStyle: "none",
      margin: 0,
      padding: "4px 0 8px 32px",
    },
    sectionItem: {
      marginBottom: 2,
    },
    sectionBtn: {
      width: "100%",
      textAlign: "left",
      padding: "6px 12px",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: 13,
      color: "#6b7280",
      borderRadius: 4,
    },
    main: {
      flex: 1,
      padding: "32px 48px",
      maxWidth: 900,
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: 800,
      color: "#111827",
      margin: 0,
    },
    subtitle: {
      fontSize: 15,
      color: "#6b7280",
      marginTop: 8,
    },
  };

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTitle}>{t("docs.navigation")}</div>
        <ul style={styles.categoryList}>
          {categories.map((cat) => (
            <li key={cat.key} style={styles.categoryItem}>
              <button
                style={{
                  ...styles.categoryBtn,
                  ...(activeCategory === cat.key ? styles.categoryBtnActive : {}),
                }}
                onClick={() => setActiveCategory(cat.key)}
                type="button"
              >
                {t(cat.labelKey)}
              </button>
              {activeCategory === cat.key && (
                <ul style={styles.sectionList}>
                  {cat.sections.map((sec) => (
                    <li key={sec.id} style={styles.sectionItem}>
                      <button
                        style={styles.sectionBtn}
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

      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>{t("docs.title")}</h1>
          <p style={styles.subtitle}>{t("docs.subtitle")}</p>
        </div>
        <CategoryComponent />
      </main>
    </div>
  );
}
