import { useState } from "react";
import { LuChevronRight, LuSearch, LuX } from "react-icons/lu";
import { LIBRARY_GROUPS, LIBRARY_ITEMS, matchesLibraryItem, type LibraryItem } from "../../../lib/elements/library";
import { IconButton } from "../../../ui/IconButton/IconButton";
import { useBoardStore } from "../../../store/boardStore";
import { LibraryPreview } from "./LibraryPreview";
import { useFontsVersion } from "../../useFontsVersion";
import { LIBRARY_DRAG_TYPE, insertLibraryItem } from "./libraryActions";
import styles from "./LibraryPanel.module.scss";

function LibraryTile({ item, fontsVersion }: { item: LibraryItem; fontsVersion: number }) {
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
        onClick={() => insertLibraryItem(item)}
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
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const searching = query.trim() !== "";
  const groups = LIBRARY_GROUPS.map((group) => ({
    ...group,
    items: LIBRARY_ITEMS.filter((item) => item.group === group.id && (!searching || matchesLibraryItem(item, query))),
  })).filter((group) => group.items.length > 0);

  function toggleGroup(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className={styles.panel} aria-label="Biblioteca de formas">
      <header className={styles.header}>
        <h2 className={styles.title}>Formas</h2>
        <IconButton icon={LuX} label="Fechar" size="sm" tooltipSide="left" onClick={() => setLibraryOpen(false)} />
      </header>

      <label className={styles.search}>
        <LuSearch aria-hidden />
        <input
          type="search"
          placeholder="Buscar formas"
          aria-label="Buscar formas"
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
          const expanded = searching || !collapsed.has(group.id);
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
        {groups.length === 0 && <p className={styles.empty}>Nenhuma forma encontrada.</p>}
      </div>

      <p className={styles.hint}>Clique para pôr no centro ou arraste para o quadro.</p>
    </aside>
  );
}
