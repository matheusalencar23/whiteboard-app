import { useCallback } from "react";
import { useBoardStore } from "../../store/boardStore";
import { Toast } from "../../ui/Toast/Toast";

export function BoardNotice() {
  const notice = useBoardStore((s) => s.notice);
  const dismissNotice = useBoardStore((s) => s.dismissNotice);
  const id = notice?.id;
  const dismiss = useCallback(() => {
    if (id !== undefined) dismissNotice(id);
  }, [id, dismissNotice]);

  if (!notice) return null;
  return <Toast key={notice.id} message={notice.message} tone={notice.tone} onDismiss={dismiss} />;
}
