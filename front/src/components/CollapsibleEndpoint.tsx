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
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      overflow: "hidden",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      backgroundColor: "#f9fafb",
      cursor: "pointer",
      borderBottom: isCollapsed ? "none" : "1px solid #e5e7eb",
    },
    endpointInfo: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    method: {
      backgroundColor: method === "POST" ? "#3b82f6" : "#10b981", // Differentiate POST and GET
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
      color: "#111827",
    },
    description: {
      color: "#374151",
      lineHeight: 1.7,
      fontSize: 14,
    },
    content: {
      padding: "16px",
      backgroundColor: "#fff",
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
          {isCollapsed ? <ChevronDown size={18} color="#6b7280" /> : <ChevronUp size={18} color="#6b7280" />}
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