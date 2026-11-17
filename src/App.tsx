import { useLayoutEffect } from "react";
import { Outlet } from "react-router";
import { applyTheme } from "./lib/theme";
import { useTheme } from "./components/useColorScheme";
import "./App.css";

function App() {
  const theme = useTheme();

  useLayoutEffect(() => applyTheme(theme), [theme]);

  return (
    <>
      <Outlet />
    </>
  );
}

export default App;
