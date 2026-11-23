import { useState } from "react";
import styles from "./Help.module.scss";
import { HELP_SECTIONS } from "./helpSections";
import { Modal } from "../../../ui/Modal/Modal";
import { useBoardStore } from "../../../store/boardStoreContext";
import { useMessages } from "../../../i18n/useMessages";

interface HelpDialogProps {
  onClose: () => void;
}

const CLOSE_KEYS = ["Escape", "?"];

export function HelpDialog({ onClose }: HelpDialogProps) {
  const config = useBoardStore((s) => s.config);
  const messages = useMessages();
  const sections = HELP_SECTIONS.filter((section) => !section.visible || section.visible(config));
  const [activeId, setActiveId] = useState(sections[0].id);
  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  return (
    <Modal title={messages.help.title} closeLabel={messages.common.close} onClose={onClose} closeKeys={CLOSE_KEYS} className={styles.dialog}>
      <nav className={styles.nav} role="tablist" aria-label="Seções da ajuda" aria-orientation="vertical">
        {sections.map(({ id, title, icon: Icon }) => (
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
