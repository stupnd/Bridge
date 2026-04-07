import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Learn from "./pages/Learn";
import Sensor from "./pages/Sensor";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";
import HandVisualizer from "./components/HandVisualizer";
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
      { index: true, Component: Dashboard },
      { path: "learn", Component: Learn },
      { path: "sensor", Component: Sensor },
      { path: "profile", Component: Profile },
      { path: "hand", Component: HandVisualizer },
    ],
  },
]);
