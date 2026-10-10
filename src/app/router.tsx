import { createBrowserRouter } from "react-router-dom";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import MainLayout from "../layouts/MainLayout";

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: "*",
        element: <DashboardPage />,
      },
    ],
  },
]);

export default router;