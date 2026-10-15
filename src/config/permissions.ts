export type Permission = string;

export const ROLE_CODES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "SALES_EXECUTIVE",
  "ACCOUNTS",
  "READ_ONLY",
] as const;

export const STANDARD_PERMISSIONS = [
  "dashboard.read",
  "users.read",
  "users.create",
  "users.update",
  "users.deactivate",
  "users.approve",
  "users.reject",
  "users.assign_role",
  "users.assign_permission",
  "roles.read",
  "roles.create",
  "roles.update",
  "roles.assign",
  "kyc.read",
  "kyc.review",
  "kyc.download",
  "customers.read",
  "customers.create",
  "customers.update",
  "sites.read",
  "sites.create",
  "sites.update",
  "quotations.read",
  "quotations.create",
  "quotations.update",
  "quotations.approve",
  "orders.read",
  "orders.create",
  "orders.update",
  "invoices.read",
  "payments.read",
  "payments.record",
  "visits.read",
  "queries.read",
  "reports.read",
  "reports.export",
  "audit_logs.read",
] as const;

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