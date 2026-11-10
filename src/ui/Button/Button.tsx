import type { IconType } from "react-icons";
import styles from "./Button.module.scss";

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  icon?: IconType;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
  autoFocus?: boolean;
}

export function Button({ children, onClick, icon: Icon, variant = "default", disabled, autoFocus }: ButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      data-variant={variant}
      disabled={disabled}
      autoFocus={autoFocus}
      onClick={onClick}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </button>
  );
}
