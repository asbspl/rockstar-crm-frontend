import { hasPermission, type Permission } from "../config/permissions";

export function usePermissions(userPermissions: readonly Permission[]) {
  return (permission: Permission) => hasPermission(userPermissions, permission);
}