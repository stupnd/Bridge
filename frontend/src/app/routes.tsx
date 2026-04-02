import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Learn from "./pages/Learn";
import Sensor from "./pages/Sensor";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";
import HandVisualizer from "./components/HandVisualizer";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/app",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "learn", Component: Learn },
      { path: "sensor", Component: Sensor },
      { path: "profile", Component: Profile },
      { path: "hand", Component: HandVisualizer },
    ],
  },
]);
