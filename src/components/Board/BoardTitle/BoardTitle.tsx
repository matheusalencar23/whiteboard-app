import { useBoardStore } from "../../../store/boardStore";
import { MAX_BOARD_NAME_LENGTH } from "../../../lib/persistence";
import { InlineEdit } from "../../../ui/InlineEdit/InlineEdit";
import styles from "./BoardTitle.module.scss";

interface BoardTitleProps {
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export function BoardTitle({ editing, onEditingChange }: BoardTitleProps) {
  const name = useBoardStore((s) => s.name);
  const setBoardName = useBoardStore((s) => s.setBoardName);

  return (
    <InlineEdit
      as="h1"
      value={name}
      label="Nome do board"
      editing={editing}
      onEditingChange={onEditingChange}
      onCommit={setBoardName}
      maxLength={MAX_BOARD_NAME_LENGTH}
      className={styles.title}
      inputClassName={styles.input}
    />
  );
}
