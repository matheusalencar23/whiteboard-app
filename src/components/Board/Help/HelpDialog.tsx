import { useState } from "react";
import styles from "./Help.module.scss";
import { HELP_SECTIONS } from "./helpSections";
import { Modal } from "../../../ui/Modal/Modal";

interface HelpDialogProps {
  onClose: () => void;
}

const CLOSE_KEYS = ["Escape", "?"];

export function HelpDialog({ onClose }: HelpDialogProps) {
  const [activeId, setActiveId] = useState(HELP_SECTIONS[0].id);
  const active = HELP_SECTIONS.find((section) => section.id === activeId) ?? HELP_SECTIONS[0];

  return (
    <Modal title="Como usar" onClose={onClose} closeKeys={CLOSE_KEYS} className={styles.dialog}>
      <nav className={styles.nav} role="tablist" aria-label="Seções da ajuda" aria-orientation="vertical">
        {HELP_SECTIONS.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`help-tab-${id}`}
            aria-selected={id === active.id}
            aria-controls="help-panel"
            className={styles.tab}
            onClick={() => setActiveId(id)}
          >
            <Icon />
            {title}
          </button>
        ))}
      </nav>
      <div id="help-panel" role="tabpanel" aria-labelledby={`help-tab-${active.id}`} className={styles.panel}>
        <h3 className={styles.panelTitle}>{active.title}</h3>
        {active.content}
      </div>
    </Modal>
  );
}
