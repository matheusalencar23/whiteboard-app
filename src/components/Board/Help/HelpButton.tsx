import { LuCircleHelp } from "react-icons/lu";
import styles from "./Help.module.scss";
import { HelpDialog } from "./HelpDialog";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { useBoardStore } from "../../../store/boardStore";
import { SHORTCUTS, formatShortcut } from "../shortcuts";

export function HelpButton() {
  const open = useBoardStore((s) => s.helpOpen);
  const setHelpOpen = useBoardStore((s) => s.setHelpOpen);

  return (
    <div className={styles.button}>
      <IconButton
        icon={LuCircleHelp}
        label="Como usar"
        shortcut={formatShortcut(SHORTCUTS.help.keys)}
        size="sm"
        tooltipSide="top"
        active={open}
        onClick={() => setHelpOpen(!open)}
      />
      {open && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
