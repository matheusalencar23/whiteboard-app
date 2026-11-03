import styles from "./Divider.module.scss";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
}

export function Divider({ orientation = "horizontal" }: DividerProps) {
  return <span className={styles.divider} data-orientation={orientation} role="separator" />;
}
