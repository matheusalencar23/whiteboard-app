import styles from "./Panel.module.scss";

interface PanelProps {
  label: string;
  direction?: "column" | "row";
  className?: string;
  children: React.ReactNode;
}

export function Panel({ label, direction = "column", className, children }: PanelProps) {
  return (
    <aside className={className ? `${styles.panel} ${className}` : styles.panel} aria-label={label} data-direction={direction}>
      {children}
    </aside>
  );
}

interface PanelSectionProps {
  title: string;
  children: React.ReactNode;
}

export function PanelSection({ title, children }: PanelSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {children}
    </section>
  );
}
