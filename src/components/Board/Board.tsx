import { Canvas } from "./Canvas/Canvas";
import { Toolbar } from "./Toolbar/Toolbar";
import { StylePanel } from "./StylePanel/StylePanel";
import { useShortcuts } from "./useShortcuts";
import styles from "./Board.module.scss";

export function Board() {
  useShortcuts();

  return (
    <div className={styles.board}>
      <div className={styles.dock}>
        <Toolbar />
        <StylePanel />
      </div>
      <Canvas />
    </div>
  );
}
