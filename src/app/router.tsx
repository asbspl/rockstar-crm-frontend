
import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import ForbiddenPage from "../features/auth/pages/ForbiddenPage";
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage";
import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";
import RegistrationStatusPage from "../features/auth/pages/RegistrationStatusPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";
import ProfilePage from "../features/auth/pages/ProfilePage";
import ApplicationsPage from "../features/admin/pages/ApplicationsPage";
import RegistrationManagement from "../features/admin/pages/RegistrationManagement";
import UserManagementPage from "../features/admin/pages/UserManagementPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import MainLayout from "../layouts/MainLayout";
import CompanyManagementPage from "../features/companies/pages/CompanyManagementPage";
import EmployeeManagementPage from "../features/employees/pages/EmployeeManagementPage";
import DriverManagementPage from "../features/drivers/pages/DriverManagementPage";
import ContractorManagementPage from "../features/contractors/pages/ContractorManagementPage";
import LocationManagementPage from "../features/locations/pages/LocationManagementPage";
import ClientManagementPage from "../features/clients/pages/ClientManagementPage";
import CustomerManagementPage from "../features/customers/pages/CustomerManagementPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/registration-status",
    element: <RegistrationStatusPage />,
  },
  {
    path: "/forbidden",
    element: <ForbiddenPage />,
  },

  // Dashboard routes
  {
    element: <ProtectedRoute requiredPermissions={["dashboard.read"]} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/settings/companies",
            element: <CompanyManagementPage />,
          },
          {
            path: "/settings/employees",
            element: <EmployeeManagementPage />,
          },
          {
            path: "settings/drivers",
            element: <DriverManagementPage />,
          },
          {
            path: "/settings/contractors",
            element: <ContractorManagementPage />,
          },
          {
            path: "/customers/locations",
            element: <LocationManagementPage />,
          },
          {
            path: "/customers/clients",
            element: <ClientManagementPage />,
          },
          {
            path: "/customers/customers",
            element: <CustomerManagementPage />,
          },
          {
            path: "/profile",
            element: <ProfilePage />,
          },
          {
            path: "/profile/permissions",
            element: <ProfilePage />,
          },
          {
            path: "/profile/settings",
            element: <ProfilePage />,
          },
        ],
      },
    ],
  },

  // Admin routes
  {
    element: <ProtectedRoute requiredPermissions={["users.read"]} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/admin",
            element: <Navigate to="/admin/applications" replace />,
          },
          {
            path: "/admin/applications",
            element: <ApplicationsPage />,
          },
          {
            path: "/admin/registrations",
            element: <RegistrationManagement />,
          },
          {
            path: "/admin/users",
            element: <UserManagementPage />,
          },
        ],
      },
    ],
  },



  // Redirect unknown URLs
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

export default router;
