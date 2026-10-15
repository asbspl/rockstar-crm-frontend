import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "../../../contexts/useAuthContext";

interface ProtectedRouteProps {
  children?: ReactNode;
  requiredPermissions?: readonly string[];
}

function ProtectedRoute({ children, requiredPermissions }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, authState, hasAnyPermission } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading" aria-live="polite" aria-busy="true">
        Checking your session...
      </div>
    );
  }

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

  if (authState === "pending") {
    return <Navigate to="/registration-status" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;
