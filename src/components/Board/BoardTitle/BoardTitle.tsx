import { useState } from "react";
import { useBoardStore } from "../../../store/boardStore";
import { MAX_BOARD_NAME_LENGTH } from "../../../lib/persistence";
import { InlineEdit } from "../../../ui/InlineEdit/InlineEdit";
import styles from "./BoardTitle.module.scss";

export function BoardTitle() {
  const name = useBoardStore((s) => s.name);
  const setBoardName = useBoardStore((s) => s.setBoardName);
  const [editing, setEditing] = useState(false);

  return (
    <InlineEdit
      as="h1"
      value={name}
      label="Nome do board"
      editing={editing}
      onEditingChange={setEditing}
      onCommit={setBoardName}
      maxLength={MAX_BOARD_NAME_LENGTH}
      className={styles.title}
      inputClassName={styles.input}
    />
  );
}
