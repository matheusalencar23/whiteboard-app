import { useState } from "react";
import { Link } from "react-router";
import { LuCopy, LuDownload, LuPencil, LuTrash2 } from "react-icons/lu";
import { IconButton } from "../../ui/IconButton/IconButton";
import { InlineEdit } from "../../ui/InlineEdit/InlineEdit";
import { MAX_BOARD_NAME_LENGTH, type BoardContent, type BoardSummary } from "../../lib/persistence";
import { downloadBoardFile } from "../../lib/boardFile";
import type { BoardElement } from "../../lib/elements/types";
import { BoardPreview } from "./BoardPreview";
import { formatUpdatedAt } from "./formatUpdatedAt";
import styles from "./Home.module.scss";

const NO_ELEMENTS: BoardElement[] = [];

interface BoardCardProps {
  summary: BoardSummary;
  content: BoardContent | null;
  fontsVersion: number;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BoardCard({ summary, content, fontsVersion, onRename, onDuplicate, onDelete }: BoardCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <article className={styles.card}>
      <Link to={`/board/${summary.id}`} className={styles.cardLink} aria-label={`Abrir ${summary.name}`}>
        <BoardPreview key={fontsVersion} elements={content?.elements ?? NO_ELEMENTS} />
      </Link>
      <div className={styles.cardFooter}>
        <div className={styles.cardText}>
          <InlineEdit
            as="h2"
            value={summary.name}
            label="Nome do board"
            editing={editing}
            onEditingChange={setEditing}
            onCommit={onRename}
            maxLength={MAX_BOARD_NAME_LENGTH}
            className={styles.cardName}
            inputClassName={styles.cardNameInput}
          />
          <span className={styles.cardMeta}>{formatUpdatedAt(summary.updatedAt)}</span>
        </div>
        <div className={styles.cardActions}>
          <IconButton icon={LuPencil} label="Renomear" size="sm" tooltipSide="top" onClick={() => setEditing(true)} />
          <IconButton icon={LuCopy} label="Duplicar" size="sm" tooltipSide="top" onClick={onDuplicate} />
          <IconButton
            icon={LuDownload}
            label="Salvar em arquivo"
            size="sm"
            tooltipSide="top"
            disabled={!content}
            onClick={() => content && downloadBoardFile(content)}
          />
          <IconButton icon={LuTrash2} label="Apagar" size="sm" tooltipSide="top" onClick={onDelete} />
        </div>
      </div>
    </article>
  );
}
