import styles from "./Help.module.scss";

interface KeysProps {
  combos: string[][];
}

export function Keys({ combos }: KeysProps) {
  return (
    <span className={styles.keys}>
      {combos.map((combo, i) => (
        <span key={combo.join()} className={styles.combo}>
          {i > 0 && <span className={styles.or}>ou</span>}
          {combo.map((key) => (
            <kbd key={key} className={styles.key}>
              {key}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  );
}
