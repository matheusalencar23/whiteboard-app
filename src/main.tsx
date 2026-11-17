import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme, getTheme } from "./lib/theme.ts";
import { resolveColorScheme } from "./components/useColorScheme.ts";
import { useAppPreferences } from "./store/appPreferences.ts";

import { createBrowserRouter, redirect } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Home } from "./components/Home/Home.tsx";
import { homeLoader } from "./components/Home/homeRoute.ts";
import { Board } from "./components/Board/Board.tsx";
import { boardLoader, shouldRevalidateBoard } from "./components/Board/boardRoute.ts";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, loader: homeLoader, Component: Home },
      { path: "board", loader: () => redirect("/") },
      { path: "board/:id", loader: boardLoader, shouldRevalidate: shouldRevalidateBoard, Component: Board },
    ],
  },
]);

applyTheme(getTheme(resolveColorScheme(useAppPreferences.getState().themeMode)));

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
