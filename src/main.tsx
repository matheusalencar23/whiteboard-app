import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme, theme } from "./lib/theme.ts";

import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Home } from "./components/Home/Home.tsx";
import { Board } from "./components/Board/Board.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, Component: Home },
      { path: "board", Component: Board },
    ],
  },
]);

applyTheme(theme);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
