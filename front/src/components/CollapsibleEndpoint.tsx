import React, { useState } from "react";
import CodeBlock from "./CodeBlock";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  method: string;
  path: string;
  description: string;
  request?: {
    code: string;
    language: string;
    filename: string;
  };
  response?: {
    code: string;
    language: string;
    filename: string;
  };
};

export default function CollapsibleEndpoint({ method, path, description, request, response }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      marginBottom: 24,
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      overflow: "hidden",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      backgroundColor: "var(--color-surface-sunken)",
      cursor: "pointer",
      borderBottom: isCollapsed ? "none" : "1px solid var(--color-border)",
    },
    endpointInfo: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    method: {
      backgroundColor: method === "POST" ? "var(--color-method-post)" : "var(--color-method-get)",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: 4,
      fontWeight: 700,
      fontSize: 12,
      minWidth: 50,
      textAlign: "center",
    },
    path: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 14,
      color: "var(--color-text-primary)",
    },
    description: {
      color: "var(--color-text-secondary)",
      lineHeight: 1.7,
      fontSize: 14,
    },
    content: {
      padding: "16px",
      backgroundColor: "var(--color-surface)",
    },
    codeBlockContainer: {
      marginTop: 16,
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={toggleCollapse}>
        <div style={styles.endpointInfo}>
          <span style={styles.method}>{method}</span>
          <span style={styles.path}>{path}</span>
        </div>
        <div>
          {isCollapsed ? <ChevronDown size={18} style={{ color: "var(--color-text-muted)" }} /> : <ChevronUp size={18} style={{ color: "var(--color-text-muted)" }} />}
        </div>
      </div>
      {!isCollapsed && (
        <div style={styles.content}>
          <p style={styles.description}>{description}</p>
          {request && (
            <div style={styles.codeBlockContainer}>
              <CodeBlock code={request.code} language={request.language} filename={request.filename} />
            </div>
          )}
          {response && (
            <div style={styles.codeBlockContainer}>
              <CodeBlock code={response.code} language={response.language} filename={response.filename} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}