import styles from "./Help.module.scss";
import { KEY_NAMES, type KeyName } from "../../../i18n/messages";
import { useMessages } from "../../../i18n/useMessages";

interface KeysProps {
  combos: string[][];
}

function isKeyName(key: string): key is KeyName {
  return (KEY_NAMES as readonly string[]).includes(key);
}

export function Keys({ combos }: KeysProps) {
  const messages = useMessages();
  return (
    <span className={styles.keys}>
      {combos.map((combo, i) => (
        <span key={combo.join()} className={styles.combo}>
          {i > 0 && <span className={styles.or}>{messages.help.or}</span>}
          {combo.map((key) => (
            <kbd key={key} className={styles.key}>
              {isKeyName(key) ? messages.help.keys[key] : key}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  );
}
