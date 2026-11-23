import { useBoardStore } from "../../../store/boardStoreContext";
import { MAX_BOARD_NAME_LENGTH } from "../../../lib/persistence";
import { InlineEdit } from "../../../ui/InlineEdit/InlineEdit";
import { focusBoard, useBoardRoot } from "../boardRoot";
import { isTypingTarget } from "../useShortcuts";
import styles from "./BoardTitle.module.scss";

interface BoardTitleProps {
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export function BoardTitle({ editing, onEditingChange }: BoardTitleProps) {
  const name = useBoardStore((s) => s.name);
  const setBoardName = useBoardStore((s) => s.setBoardName);
  const renameAllowed = useBoardStore((s) => s.config.rename);
  const rootRef = useBoardRoot();

  function handleEditingChange(next: boolean) {
    const active = document.activeElement;
    if (!next && isTypingTarget(active) && rootRef.current?.contains(active)) focusBoard(rootRef);
    onEditingChange(next);
  }

  return (
    <InlineEdit
      as="h1"
      value={name}
      label="Nome do board"
      editing={editing}
      readOnly={!renameAllowed}
      onEditingChange={handleEditingChange}
      onCommit={setBoardName}
      maxLength={MAX_BOARD_NAME_LENGTH}
      className={styles.title}
      inputClassName={styles.input}
    />
  );
}
