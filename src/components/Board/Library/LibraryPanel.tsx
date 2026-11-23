import { useState } from "react";
import { LuChevronRight, LuSearch, LuX } from "react-icons/lu";
import { LIBRARY_GROUPS, LIBRARY_ITEMS, matchesLibraryItem, type LibraryItem } from "../../../lib/elements/library";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { useBoardStore, useBoardStoreApi } from "../../../store/boardStoreContext";
import { LibraryPreview } from "./LibraryPreview";
import { useFontsVersion } from "../../fonts";
import { LIBRARY_DRAG_TYPE, insertLibraryItem } from "./libraryActions";
import { useMessages } from "../../../i18n/useMessages";
import styles from "./LibraryPanel.module.scss";

function LibraryTile({ item, fontsVersion }: { item: LibraryItem; fontsVersion: number }) {
  const boardStore = useBoardStoreApi();

  function handleDragStart(e: React.DragEvent<HTMLButtonElement>) {
    e.dataTransfer.setData(LIBRARY_DRAG_TYPE, item.id);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <li>
      <button
        type="button"
        className={styles.tile}
        draggable
        onDragStart={handleDragStart}
        onClick={() => insertLibraryItem(boardStore, item)}
      >
        <LibraryPreview item={item} fontsVersion={fontsVersion} />
        <span className={styles.tileName}>{item.name}</span>
      </button>
    </li>
  );
}

export function LibraryPanel() {
  const setLibraryOpen = useBoardStore((s) => s.setLibraryOpen);
  const [query, setQuery] = useState("");
  const fontsVersion = useFontsVersion();
  const collapsed = useBoardStore((s) => s.collapsedLibraryGroups);
  const toggleGroup = useBoardStore((s) => s.toggleLibraryGroup);
  const messages = useMessages();

  const searching = query.trim() !== "";
  const groups = LIBRARY_GROUPS.map((group) => ({
    ...group,
    items: LIBRARY_ITEMS.filter((item) => item.group === group.id && (!searching || matchesLibraryItem(item, query))),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className={styles.panel} aria-label={messages.library.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>{messages.library.title}</h2>
        <IconButton icon={LuX} label={messages.common.close} size="sm" tooltipSide="left" onClick={() => setLibraryOpen(false)} />
      </header>

      <label className={styles.search}>
        <LuSearch aria-hidden />
        <input
          type="search"
          placeholder={messages.library.search}
          aria-label={messages.library.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query !== "") {
              e.stopPropagation();
              setQuery("");
            }
          }}
        />
      </label>

      <div className={styles.groups}>
        {groups.map((group) => {
          const expanded = searching || !collapsed.includes(group.id);
          return (
            <section key={group.id} className={styles.group}>
              <button
                type="button"
                className={styles.groupHeader}
                aria-expanded={expanded}
                disabled={searching}
                onClick={() => toggleGroup(group.id)}
              >
                <LuChevronRight className={styles.chevron} aria-hidden />
                <span>{group.name}</span>
                <span className={styles.count}>{group.items.length}</span>
              </button>
              {expanded && (
                <ul className={styles.grid}>
                  {group.items.map((item) => (
                    <LibraryTile key={item.id} item={item} fontsVersion={fontsVersion} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        {groups.length === 0 && <p className={styles.empty}>{messages.library.empty}</p>}
      </div>

      <p className={styles.hint}>{messages.library.hint}</p>
    </aside>
  );
}
