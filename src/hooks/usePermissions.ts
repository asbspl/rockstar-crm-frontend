import { useAuthContext } from "../contexts/useAuthContext";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "../config/permissions";

export function usePermissions(userPermissions?: readonly Permission[]) {
  const { permissions: authPermissions } = useAuthContext();
  const permissions = userPermissions ?? authPermissions;

  return {
    hasPermission: (permission: Permission) => hasPermission(permissions, permission),
    hasAnyPermission: (permissionKeys: readonly Permission[]) =>
      hasAnyPermission(permissions, permissionKeys),
    hasAllPermissions: (permissionKeys: readonly Permission[]) =>
      hasAllPermissions(permissions, permissionKeys),
  };
}