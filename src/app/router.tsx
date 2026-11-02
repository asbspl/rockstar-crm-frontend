
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
import AccessManagementPage from "../features/admin/pages/AccessManagementPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import MainLayout from "../layouts/MainLayout";
import CompanyManagementPage from "../features/companies/pages/CompanyManagementPage";
import EmployeeManagementPage from "../features/employees/pages/EmployeeManagementPage";
import DriverManagementPage from "../features/drivers/pages/DriverManagementPage";
import ContractorManagementPage from "../features/contractors/pages/ContractorManagementPage";
import LocationManagementPage from "../features/locations/pages/LocationManagementPage";
import ClientManagementPage from "../features/clients/pages/ClientManagementPage";
import CustomerManagementPage from "../features/customers/pages/CustomerManagementPage";
import SiteManagementPage from "../features/sites/pages/SiteManagementPage";
import ProductManagementPage from "../features/products/pages/ProductManagementPage";
import RateMatrixManagementPage from "../features/rate-matrix/pages/RateMatrixManagementPage";
import QuotationManagementPage from "../features/quotations/pages/QuotationManagementPage";
import OrderManagementPage from "../features/orders/pages/OrderManagementPage";
import UserActivityPage from "../features/admin/pages/UserActivityPage";


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

  // CRM routes require an active session; each module applies its own permission.
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/dashboard",
            element: (
              <ProtectedRoute requiredPermissions={["dashboard.read"]}>
                <DashboardPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/settings/companies",
            element: (
              <ProtectedRoute requiredRoles={["ADMIN", "SUPER_ADMIN"]}>
                <CompanyManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/settings/employees",
            element: (
              <ProtectedRoute requiredRoles={["ADMIN", "SUPER_ADMIN"]}>
                <EmployeeManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "settings/drivers",
            element: (
              <ProtectedRoute requiredRoles={["ADMIN", "SUPER_ADMIN"]}>
                <DriverManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/settings/contractors",
            element: (
              <ProtectedRoute requiredRoles={["ADMIN", "SUPER_ADMIN"]}>
                <ContractorManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/locations",
            element: (
              <ProtectedRoute requiredRoles={["ADMIN", "SUPER_ADMIN"]}>
                <LocationManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/clients",
            element: (
              <ProtectedRoute requiredPermissions={["customers.read"]}>
                <ClientManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/customers",
            element: (
              <ProtectedRoute requiredPermissions={["customers.read"]}>
                <CustomerManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/sites",
            element: (
              <ProtectedRoute requiredPermissions={["sites.read"]}>
                <SiteManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/quotations",
            element: (
              <ProtectedRoute requiredPermissions={["quotations.read"]}>
                <QuotationManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/orders",
            element: (
              <ProtectedRoute requiredPermissions={["orders.read"]}>
                <OrderManagementPage />
              </ProtectedRoute>
            ),
          },

          {
            path: "/products/products",
            element: (
              <ProtectedRoute requiredRoles={["ADMIN", "SUPER_ADMIN"]}>
                <ProductManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/products/rate-matrix",
            element: (
              <ProtectedRoute requiredRoles={["ADMIN", "SUPER_ADMIN"]}>
                <RateMatrixManagementPage />
              </ProtectedRoute>
            ),
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
    element: (
      <ProtectedRoute
        requiredPermissions={["users.read"]}
        requiredRoles={["ADMIN", "SUPER_ADMIN"]}
      />
    ),
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
          {
            path: "/admin/access",
            element: <AccessManagementPage />,
          },
          {
            path: "/admin/user-activity",
            element: (
              <ProtectedRoute requiredPermissions={["audit_logs.read"]}>
                <UserActivityPage />
              </ProtectedRoute>
            ),
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
