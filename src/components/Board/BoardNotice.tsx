import { useCallback } from "react";
import { useBoardStore } from "../../store/boardStoreContext";
import { Toast } from "../../ui/Toast/Toast";
import { useMessages } from "../../i18n/useMessages";

export function BoardNotice() {
  const notice = useBoardStore((s) => s.notice);
  const dismissNotice = useBoardStore((s) => s.dismissNotice);
  const messages = useMessages();
  const id = notice?.id;
  const dismiss = useCallback(() => {
    if (id !== undefined) dismissNotice(id);
  }, [id, dismissNotice]);

  if (!notice) return null;
  return <Toast key={notice.id} message={notice.message} closeLabel={messages.common.dismissNotice} tone={notice.tone} onDismiss={dismiss} />;
}
