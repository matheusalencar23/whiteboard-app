import { useCallback, useEffect, useState } from "react";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { LuFolderOpen, LuPlus } from "react-icons/lu";
import { Button } from "../../ui/Button/Button";
import { Modal } from "../../ui/Modal/Modal";
import { Toast } from "../../ui/Toast/Toast";
import {
  createStoredBoard,
  deleteStoredBoard,
  duplicateStoredBoard,
  renameStoredBoard,
  type BoardSummary,
} from "../../lib/persistence";
import { pickBoardFile, readBoardFile } from "../../lib/boardFile";
import { useFontsVersion } from "../useFontsVersion";
import { BoardCard } from "./BoardCard";
import type { homeLoader } from "./homeRoute";
import styles from "./Home.module.scss";

const STORAGE_FULL = "Não foi possível salvar: o armazenamento do navegador está cheio.";

export function Home() {
  const navigate = useNavigate();
  const fontsVersion = useFontsVersion();
  const boards = useLoaderData<typeof homeLoader>();
  const { revalidate } = useRevalidator();
  const [pendingDelete, setPendingDelete] = useState<BoardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Whiteboard";
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  const refresh = () => void revalidate();

  function openNew(id: string | null) {
    if (id) navigate(`/board/${id}`);
    else setError(STORAGE_FULL);
  }

  async function importFile() {
    const file = await pickBoardFile();
    if (!file) return;
    const result = await readBoardFile(file);
    if (!result.ok) {
      setError(`"${result.name}" não é um board válido.`);
      return;
    }
    openNew(createStoredBoard(result.board));
  }

  function duplicate(id: string) {
    if (!duplicateStoredBoard(id)) setError(STORAGE_FULL);
    refresh();
  }

  function rename(id: string, name: string) {
    if (!renameStoredBoard(id, name)) setError(STORAGE_FULL);
    refresh();
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteStoredBoard(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }

  return (
    <div className={styles.home}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.brand}>Whiteboard</h1>
            <p className={styles.subtitle}>
              {boards.length === 0
                ? "Seus boards ficam salvos neste navegador."
                : `${boards.length} ${boards.length === 1 ? "board salvo" : "boards salvos"} neste navegador`}
            </p>
          </div>
          <div className={styles.headerActions}>
            <Button icon={LuFolderOpen} onClick={() => void importFile()}>
              Abrir arquivo
            </Button>
            <Button icon={LuPlus} variant="primary" onClick={() => openNew(createStoredBoard())}>
              Novo board
            </Button>
          </div>
        </header>

        {boards.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nenhum board ainda</p>
            <p>Crie um board em branco ou abra um arquivo .whiteboard.json.</p>
            <Button icon={LuPlus} variant="primary" onClick={() => openNew(createStoredBoard())}>
              Criar o primeiro board
            </Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {boards.map(({ summary, content }) => (
              <BoardCard
                key={summary.id}
                summary={summary}
                content={content}
                fontsVersion={fontsVersion}
                onRename={(name) => rename(summary.id, name)}
                onDuplicate={() => duplicate(summary.id)}
                onDelete={() => setPendingDelete(summary)}
              />
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <Modal title="Apagar board" onClose={() => setPendingDelete(null)} className={styles.confirm}>
          <div className={styles.confirmBody}>
            <p>
              <strong>{pendingDelete.name}</strong> será apagado deste navegador. Não dá para desfazer. Se quiser
              guardar uma cópia, salve em arquivo antes.
            </p>
            <div className={styles.confirmActions}>
              <Button onClick={() => setPendingDelete(null)}>Cancelar</Button>
              <Button variant="danger" autoFocus onClick={confirmDelete}>
                Apagar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {error && (
        <div className={styles.toast}>
          <Toast key={error} message={error} tone="error" onDismiss={dismissError} />
        </div>
      )}
    </div>
  );
}
