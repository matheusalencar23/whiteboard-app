import { Canvas } from "./Canvas/Canvas";
import { Toolbar } from "./Toolbar/Toolbar";
import { useShortcuts } from "./useShortcuts";
import styles from "./Board.module.scss";

export function Board() {
  useShortcuts();

  return (
    <div className={styles.board}>
      <Toolbar />
      <Canvas />
    </div>
  );
}
