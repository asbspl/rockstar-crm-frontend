export type Permission = string;

export function hasPermission(
  userPermissions: readonly Permission[],
  permission: Permission,
): boolean {
  return userPermissions.includes(permission);
}