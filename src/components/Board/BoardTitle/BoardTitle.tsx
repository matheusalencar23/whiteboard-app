import { useState } from "react";
import { useBoardStore } from "../../../store/boardStore";
import { MAX_BOARD_NAME_LENGTH } from "../../../lib/persistence";
import styles from "./BoardTitle.module.scss";

export function BoardTitle() {
  const name = useBoardStore((s) => s.name);
  const setBoardName = useBoardStore((s) => s.setBoardName);
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    setBoardName(draft);
    setDraft(null);
  }

  if (draft !== null) {
    return (
      <input
        className={styles.input}
        value={draft}
        maxLength={MAX_BOARD_NAME_LENGTH}
        aria-label="Nome do board"
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setDraft(null);
        }}
        size={Math.max(draft.length, 8)}
      />
    );
  }

  return (
    <h1 className={styles.title} title="Duplo clique para renomear" onDoubleClick={() => setDraft(name)}>
      {name}
    </h1>
  );
}
