import React from "react";
import { useTranslation } from "react-i18next";
import DocSection from "../../../components/DocSection";

export default function Security() {
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
    { q: t("docs.faq.securityQ1"), a: t("docs.faq.securityA1") },
    { q: t("docs.faq.securityQ2"), a: t("docs.faq.securityA2") },
    { q: t("docs.faq.securityQ3"), a: t("docs.faq.securityA3") },
    { q: t("docs.faq.securityQ4"), a: t("docs.faq.securityA4") },
  ];

  return (
    <DocSection id="security" title={t("docs.faq.security")}>
      {faqs.map((faq, i) => (
        <div key={i} style={styles.faqItem}>
          <div style={styles.question}>{faq.q}</div>
          <div style={styles.answer}>{faq.a}</div>
        </div>
      ))}
    </DocSection>
  );
}
