import React, { useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  code: string;
  language?: string;
  filename?: string;
};

export default function CodeBlock({ code, language, filename }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    wrapper: {
      borderRadius: 8,
      border: "1px solid var(--color-border)",
      overflow: "hidden",
      marginBottom: 16,
      background: "var(--color-code-bg)",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      background: "var(--color-code-header)",
      borderBottom: "1px solid var(--color-code-header-border)",
    },
    filename: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--color-code-filename)",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    language: {
      fontSize: 11,
      color: "var(--color-code-lang)",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    copyBtn: {
      padding: "4px 10px",
      borderRadius: 4,
      border: "1px solid var(--color-code-btn-border)",
      background: "var(--color-code-btn-bg)",
      color: "var(--color-code-btn-text)",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
    },
    copyBtnCopied: {
      background: "var(--color-success)",
      borderColor: "var(--color-success)",
      color: "#fff",
    },
    codeArea: {
      padding: "14px 16px",
      overflowX: "auto",
    },
    pre: {
      margin: 0,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.6,
      color: "var(--color-code-text)",
      whiteSpace: "pre",
    },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {filename && <span style={styles.filename}>{filename}</span>}
          {language && <span style={styles.language}>{language}</span>}
        </div>
        <button
          style={{ ...styles.copyBtn, ...(copied ? styles.copyBtnCopied : {}) }}
          onClick={copyToClipboard}
          type="button"
        >
          {copied ? t("docs.copied") : t("docs.copy")}
        </button>
      </div>
      <div style={styles.codeArea}>
        <pre style={styles.pre}>{code}</pre>
      </div>
    </div>
  );
}
