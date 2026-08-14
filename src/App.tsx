
import { useEffect } from "react";
import "./App.css";
import { Canvas } from "./components/Canvas/Canvas";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { useAutosave } from "./hooks/useAutosave";
import { useCanvasStore } from "./store/useCanvasStore";
import { loadFromLocalStorage } from "./lib/persistence/storage";
import { StylePanel } from "./components/StylePanel/StylePanel";

function App() {
  const { setElements } = useCanvasStore();
  useAutosave();

  useEffect(() => {
    const saved = loadFromLocalStorage();
    if (saved) setElements(saved);
  }, [setElements]);

  return (
    <>
      <Toolbar />
      <Canvas />
      <StylePanel />
    </>
  );
}


export default App;
