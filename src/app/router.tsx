
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
import { getRouteReadPermissions } from "../config/permissions";


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
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/dashboard")}>
                <DashboardPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/settings/companies",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/settings/companies")}>
                <CompanyManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/settings/employees",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/settings/employees")}>
                <EmployeeManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "settings/drivers",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/settings/drivers")}>
                <DriverManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/settings/contractors",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/settings/contractors")}>
                <ContractorManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/locations",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/customers/locations")}>
                <LocationManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/clients",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/customers/clients")}>
                <ClientManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/customers",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/customers/customers")}>
                <CustomerManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/sites",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/customers/sites")}>
                <SiteManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/quotations",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/customers/quotations")}>
                <QuotationManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customers/orders",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/customers/orders")}>
                <OrderManagementPage />
              </ProtectedRoute>
            ),
          },

          {
            path: "/products/products",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/products/products")}>
                <ProductManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/products/rate-matrix",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/products/rate-matrix")}>
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
      <ProtectedRoute />
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
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/admin/applications")}>
                <ApplicationsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/admin/registrations",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/admin/registrations")}>
                <RegistrationManagement />
              </ProtectedRoute>
            ),
          },
          {
            path: "/admin/users",
            element: (
              <ProtectedRoute requiredPermissions={getRouteReadPermissions("/admin/users")}>
                <UserManagementPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/admin/access",
            element: (
              <ProtectedRoute requiredAllPermissions={getRouteReadPermissions("/admin/access")}>
                <AccessManagementPage />
              </ProtectedRoute>
            ),
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
