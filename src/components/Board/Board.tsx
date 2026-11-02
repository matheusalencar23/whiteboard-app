import { Canvas } from "./Canvas/Canvas";
import styles from "./Board.module.scss"

export function Board() {
  return (
    <div className={styles.board}>
      <Canvas />
    </div>
  );
}
