import { Canvas } from "./Canvas/Canvas";
import { Toolbar } from "./Toolbar/Toolbar";
import { useShortcuts } from "./useShortcuts";
import { ZoomIndicator } from "./ZoomIndicator/ZoomIndicator";
import styles from "./Board.module.scss";

export function Board() {
  useShortcuts();

  return (
    <div className={styles.board}>
      <div className={styles.dock}>
        <Toolbar />
      </div>
      <Canvas />
      <div className={styles.zoom}>
        <ZoomIndicator />
      </div>
    </div>
  );
}
