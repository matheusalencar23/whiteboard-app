import { useCallback, useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { Whiteboard } from "./Whiteboard";
import type { boardLoader } from "./boardRoute";
import type { WhiteboardScene } from "../../store/boardStore";
import { onBoardSaveFailure, scheduleBoardSave } from "../../store/appBoardSaving";
import { setAppPreferences, useAppPreferences } from "../../store/appPreferences";
import { Toast } from "../../ui/Toast/Toast";
import styles from "./Board.module.scss";

const STORAGE_FULL = "Não foi possível salvar: o armazenamento do navegador está cheio.";

function pageTitle(name: string) {
  return `${name} · Whiteboard`;
}

export function Board() {
  const { id, board } = useLoaderData<typeof boardLoader>();
  const navigate = useNavigate();
  const [initialPreferences] = useState(() => useAppPreferences.getState());
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    document.title = pageTitle(board.name);
  }, [board]);

  useEffect(() => onBoardSaveFailure(() => setSaveFailed(true)), []);

  const handleChange = useCallback(
    (scene: WhiteboardScene) => {
      document.title = pageTitle(scene.name);
      scheduleBoardSave(id, scene);
    },
    [id],
  );

  const dismissSaveFailure = useCallback(() => setSaveFailed(false), []);

  return (
    <div className={styles.page}>
      <Whiteboard
        key={id}
        initialData={board}
        initialPreferences={initialPreferences}
        onChange={handleChange}
        onPreferencesChange={setAppPreferences}
        back={{ label: "Todos os boards", onClick: () => navigate("/") }}
        autoFocus
      />
      {saveFailed && (
        <div className={styles.notice}>
          <Toast message={STORAGE_FULL} tone="error" onDismiss={dismissSaveFailure} />
        </div>
      )}
    </div>
  );
}
