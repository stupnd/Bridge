import { createBrowserRouter, Navigate } from "react-router";
import Login from "./pages/Login";
import Translate from "./pages/Translate";
import Learn from "./pages/Learn";
import Glove from "./pages/Glove";
import Profile from "./pages/Profile";
import Collect from "./pages/Collect";
import Lab from "./pages/Lab";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { SensorProvider } from "./context/SensorContext";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <SensorProvider>
          <Layout />
        </SensorProvider>
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Translate },
      { path: "learn", Component: Learn },
      { path: "glove", Component: Glove },
      { path: "collect", Component: Collect },
      { path: "lab", Component: Lab },
      { path: "profile", Component: Profile },
      // Old URLs: the Sensor page and the hand visualizer are now the Glove page.
      { path: "sensor", element: <Navigate to="/app/glove" replace /> },
      { path: "hand", element: <Navigate to="/app/glove" replace /> },
    ],
  },
]);
