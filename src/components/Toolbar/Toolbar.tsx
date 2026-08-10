import type { Tool } from "../../lib/canvas/types";
import { useCanvasStore } from "../../store/useCanvasStore";
import { FaMousePointer } from "react-icons/fa";
import { RiRectangleLine } from "react-icons/ri";
import type { IconType } from "react-icons";
import { IoEllipseOutline } from "react-icons/io5";
import { TbArrowLeftCircle, TbLetterT, TbLine } from "react-icons/tb";
// import { exportToJsonFile, importFromJsonFile } from "../../lib/persistence/fileTransfer";
import "./style.css";

const tools: { name: Tool; icon: IconType; style?: React.CSSProperties }[] = [
  {
    name: "selection",
    icon: FaMousePointer,
  },
  {
    name: "rectangle",
    icon: RiRectangleLine,
  },
  {
    name: "ellipse",
    icon: IoEllipseOutline,
  },
  {
    name: "line",
    icon: TbLine,
  },
  {
    name: "arrow",
    icon: TbArrowLeftCircle,
    style: {
      transform: "rotate(135deg)",
    },
  },
  {
    name: "text",
    icon: TbLetterT,
  },
];

export function Toolbar() {
  const { activeTool, setTool, setSelectedElementIds } = useCanvasStore();

  function selectTool(tool: Tool) {
    const { editingElementId } = useCanvasStore.getState();

    if (editingElementId) {
      (document.activeElement as HTMLElement)?.blur();
    }

    setSelectedElementIds([]);
    setTool(tool);
  }

  // async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   try {
  //     const elements = await importFromJsonFile(file);
  //     useCanvasStore.getState().setElements(elements);
  //   } catch {
  //     alert("Não foi possível importar este arquivo.");
  //   }
  // }

  return (
    <div className="toolbar">
      {tools.map((tool) => (
        <button
          key={tool.name}
          onClick={() => selectTool(tool.name)}
          className={activeTool === tool.name ? "active" : ""}
          title={tool.name}
        >
          {<tool.icon size={16} style={tool.style} />}
        </button>
      ))}

      {/* <button onClick={() => exportToJsonFile(elements)}>exportar</button> */}
      {/* <input type="file" accept="application/json" onChange={handleImport} /> */}
    </div>
  );
}
