export type Permission = string;

export function normalizePermissionList(
  userPermissions: readonly Permission[],
): string[] {
  return [...new Set(userPermissions.map((permission) => permission.trim().toLowerCase()).filter(Boolean))];
}

export function hasPermission(
  userPermissions: readonly Permission[],
  permission: Permission,
): boolean {
  return normalizePermissionList(userPermissions).includes(permission.trim().toLowerCase());
}

export function hasAnyPermission(
  userPermissions: readonly Permission[],
  permissions: readonly Permission[],
): boolean {
  const normalizedUserPermissions = normalizePermissionList(userPermissions);
  return permissions.some((permission) =>
    normalizedUserPermissions.includes(permission.trim().toLowerCase()),
  );
}

export function hasAllPermissions(
  userPermissions: readonly Permission[],
  permissions: readonly Permission[],
): boolean {
  const normalizedUserPermissions = normalizePermissionList(userPermissions);
  return permissions.every((permission) =>
    normalizedUserPermissions.includes(permission.trim().toLowerCase()),
  );
}