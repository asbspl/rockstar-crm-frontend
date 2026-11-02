import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "../../../contexts/useAuthContext";

interface ProtectedRouteProps {
  children?: ReactNode;
  requiredPermissions?: readonly string[];
  requiredRoles?: readonly string[];
}

function ProtectedRoute({
  children,
  requiredPermissions,
  requiredRoles,
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    authState,
    roles,
    hasAnyPermission,
  } = useAuthContext();

  const location = useLocation();

  // Wait until the authentication context finishes checking the session.
  if (isLoading) {
    return (
      <div
        className="auth-loading"
        aria-live="polite"
        aria-busy="true"
      >
        Checking your session...
      </div>
    );
  }

  // No valid authenticated session: redirect to login.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search,
        }}
      />
    );
  }

  if (
    authState === "pending" ||
    authState === "rejected" ||
    authState === "suspended"
  ) {
    return <Navigate to="/registration-status" replace />;
  }

  if (authState === "forbidden") {
    return <Navigate to="/forbidden" replace />;
  }

  // Authenticated users must still have the required permission.
  if (
    requiredPermissions &&
    requiredPermissions.length > 0 &&
    !hasAnyPermission(requiredPermissions)
  ) {
    return <Navigate to="/forbidden" replace />;
  }

  if (
    requiredRoles &&
    requiredRoles.length > 0 &&
    !requiredRoles.some((requiredRole) =>
      roles.some(
        (role) => role.trim().toLowerCase() === requiredRole.trim().toLowerCase(),
      ),
    )
  ) {
    return <Navigate to="/forbidden" replace />;
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;