import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../../contexts/useAuthContext";

interface RequirePermissionProps {
  permissions: readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
}

function RequirePermission({ permissions, children, fallback }: RequirePermissionProps) {
  const { isAuthenticated, isLoading, authState, hasAnyPermission } = useAuthContext();

  if (isLoading) {
    return <div className="auth-loading">Checking access...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (authState === "pending") {
    return <Navigate to="/registration-status" replace />;
  }

  if (!hasAnyPermission(permissions)) {
    return fallback ?? <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}

export default RequirePermission;
