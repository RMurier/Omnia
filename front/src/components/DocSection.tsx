import React from "react";

type Props = {
  id: string;
  title: string;
  children: React.ReactNode;
};

export default function DocSection({ id, title, children }: Props) {
  const styles: Record<string, React.CSSProperties> = {
    section: {
      marginBottom: 48,
      scrollMarginTop: 80,
    },
    title: {
      fontSize: 20,
      fontWeight: 700,
      color: "var(--color-text-primary)",
      marginBottom: 16,
      paddingBottom: 8,
      borderBottom: "2px solid var(--color-border)",
    },
    content: {
      color: "var(--color-text-secondary)",
      lineHeight: 1.7,
    },
  };

  return (
    <section id={id} style={styles.section}>
      <h2 style={styles.title}>{title}</h2>
      <div style={styles.content}>{children}</div>
    </section>
  );
}
