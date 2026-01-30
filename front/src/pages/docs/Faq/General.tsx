import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";

export default function General() {
  const { t } = useTranslation();

  const styles: Record<string, React.CSSProperties> = {
    faqItem: {
      marginBottom: 24,
    },
    question: {
      fontWeight: 700,
      color: "#111827",
      marginBottom: 8,
      fontSize: 15,
    },
    answer: {
      color: "#374151",
      lineHeight: 1.7,
      paddingLeft: 16,
      borderLeft: "3px solid #e5e7eb",
    },
  };

  const faqs = [
    { q: t("docs.faq.generalQ1"), a: t("docs.faq.generalA1") },
    { q: t("docs.faq.generalQ2"), a: t("docs.faq.generalA2") },
    { q: t("docs.faq.generalQ3"), a: t("docs.faq.generalA3") },
    { q: t("docs.faq.generalQ4"), a: t("docs.faq.generalA4") },
  ];

  return (
    <DocSection id="general" title={t("docs.faq.general")}>
      {faqs.map((faq, i) => (
        <div key={i} style={styles.faqItem}>
          <div style={styles.question}>{faq.q}</div>
          <div style={styles.answer}>{faq.a}</div>
        </div>
      ))}
    </DocSection>
  );
}
