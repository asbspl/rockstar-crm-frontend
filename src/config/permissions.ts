export type Permission = string;
export type ModuleAction = "read" | "create" | "update" | "delete";

const routeModules: Record<string, string> = {
  "/dashboard": "dashboard",
  "/settings/companies": "company",
  "/settings/employees": "employees",
  "/settings/drivers": "drivers",
  "/settings/contractors": "contractors",
  "/customers/locations": "settings",
  "/customers/clients": "clients",
  "/customers/customers": "customers",
  "/customers/sites": "sites",
  "/customers/quotations": "quotations",
  "/customers/orders": "orders",
  "/products/products": "settings",
  "/products/rate-matrix": "settings",
  "/admin/users": "users",
  "/admin/applications": "users",
  "/admin/registrations": "registrations",
  "/admin/user-activity": "audit_logs",
};

function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return path || "/";
}

export function getModulePermission(
  pathname: string,
  action: ModuleAction,
): Permission | undefined {
  const path = normalizePath(pathname);
  const route = Object.keys(routeModules)
    .sort((left, right) => right.length - left.length)
    .find((candidate) => path === candidate || path.startsWith(`${candidate}/`));
  const module =
    (route && routeModules[route]) ??
    path.split("/").filter(Boolean).at(-1)?.replace(/-/g, "_");

  if (module === "settings" && action !== "read") {
    return action === "delete" ? "settings.delete" : "settings.update";
  }
  return module ? `${module}.${action}` : undefined;
}

export function getRouteReadPermissions(pathname: string): Permission[] {
  const path = normalizePath(pathname);
  if (path === "/admin/access" || path.startsWith("/admin/access/")) {
    return ["users.read", "permissions.read"];
  }
  const permission = getModulePermission(path, "read");
  return permission ? [permission] : [];
}

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