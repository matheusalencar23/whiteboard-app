import { useLayoutEffect } from "react";
import { Outlet } from "react-router";
import { applyTheme, getTheme } from "./lib/theme";
import { useResolvedColorScheme } from "./components/useColorScheme";
import { useAppPreferences } from "./store/appPreferences";
import "./App.css";

function App() {
  const theme = getTheme(useResolvedColorScheme(useAppPreferences((s) => s.themeMode)));

  useLayoutEffect(() => applyTheme(theme), [theme]);

  return (
    <>
      <Outlet />
    </>
  );
}

export default App;
