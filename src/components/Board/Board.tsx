import { Canvas } from "./Canvas/Canvas";
import { Toolbar } from "./Toolbar/Toolbar";
import { useShortcuts } from "./useShortcuts";
import { ZoomIndicator } from "./ZoomIndicator/ZoomIndicator";
import { HelpButton } from "./Help/HelpButton";
import styles from "./Board.module.scss";

export function Board() {
  useShortcuts();

  return (
    <div className={styles.board}>
      <div className={styles.dock}>
        <Toolbar />
      </div>
      <Canvas />
      <div className={styles.corner}>
        <ZoomIndicator />
        <HelpButton />
      </div>
    </div>
  );
}
