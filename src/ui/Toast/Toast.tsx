import { useEffect } from "react";
import { LuCircleAlert, LuInfo, LuX } from "react-icons/lu";
import styles from "./Toast.module.scss";

interface ToastProps {
  message: string;
  tone?: "info" | "error";
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ message, tone = "info", duration = 4000, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  const Icon = tone === "error" ? LuCircleAlert : LuInfo;

  return (
    <div className={styles.toast} data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <Icon className={styles.icon} aria-hidden="true" />
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.close} aria-label="Fechar aviso" onClick={onDismiss}>
        <LuX />
      </button>
    </div>
  );
}
