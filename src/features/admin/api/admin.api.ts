
import api from "../../../api/client";

/* =========================================================
   SHARED TYPES
========================================================= */

export type RegistrationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

export interface AccessOption {
  id: number;
  name: string;
  key?: string;
  description?: string | null;
  module?: string | null;
  moduleKey?: string | null;
  moduleId?: number;
  code?: string | null;
  is_active?: boolean;
  assignedUserCount?: number;
}

export interface RegistrationRole {
  id: number;
  name: string;
  description?: string | null;
}

export interface RegistrationPermission {
  id: number;
  name: string;
  description?: string | null;
  module?: string | null;
  code?: string | null;
}

export interface Registration {
  id: string | number;
  full_name?: string;
  applicantName?: string;
  email?: string;
  phone?: string | null;
  phone_number?: string | null;
  created_at?: string;
  submittedAt?: string;
  status?: RegistrationStatus | string;
  account_status?: RegistrationStatus | string;
}

export interface RegistrationDetails extends Registration {
  roles?: AccessOption[];
  effectivePermissions?: AccessOption[];
  permissionIds?: number[];
  permissionOverrides?: { id: number; key: string; effect: "grant" | "deny" }[];
  permissions?: AccessOption[];
  profile?: Record<string, unknown> | null;
  kyc?: Record<string, unknown> | null;
  bank?: Record<string, unknown> | null;
  documents?: unknown;
  [key: string]: unknown;
}

export interface RegistrationReviewPayload {
  decision: "approved" | "rejected";
  reason?: string;
  roleIds: number[];
  permissionIds: number[];
}

export interface RegistrationReviewResult {
  ok: boolean;
  message?: string;
}

/* =========================================================
   APPLICATION MANAGEMENT TYPES
========================================================= */

export interface AdminApplication {
  id: string | number;
  applicationReference?: string | null;
  applicantName?: string | null;
  email?: string | null;
  status?: string | null;
  submittedAt?: string | null;
}

/* =========================================================
   USER MANAGEMENT TYPES
========================================================= */

export interface AdminUser {
  id: string | number;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  status?: string | null;
  roles?: string[];
  permissions?: string[];
  account_status?: string;
}

export interface PermissionModule {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  permissionCount?: number;
}

export interface AdminUserStatusPayload {
  status: "active" | "inactive";
}

/* =========================================================
   API RESPONSE TYPES AND HELPERS
========================================================= */

interface ApiResponse<T> {
  data?: T;
  success?: boolean;
  ok?: boolean;
  message?: string;
  users?: T;
  registrations?: T;
  applications?: T;
}

function unwrapData<T>(responseData: unknown): T {
  if (
    responseData !== null &&
    typeof responseData === "object" &&
    "data" in responseData
  ) {
    return (responseData as ApiResponse<T>).data as T;
  }

  return responseData as T;
}

function extractArray<T>(
  payload: unknown,
  keys: string[],
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload !== null && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of keys) {
      if (Array.isArray(record[key])) {
        return record[key] as T[];
      }
    }
  }

  throw new Error("The API returned an unexpected list response.");
}

/* =========================================================
   REGISTRATION MANAGEMENT API
========================================================= */



export async function getRegistrationRequests(
  status?: RegistrationStatus,
): Promise<Registration[]> {
  const response = await api.get("/api/admin/registrations", {
    params: status ? { status } : {},
  });

  const payload = unwrapData<unknown>(response.data);

  return extractArray<Registration>(payload, [
    "registrations",
    "applications",
  ]);
}



export async function getRegistrationDetails(
  registrationId: string | number,
): Promise<RegistrationDetails> {
  const response = await api.get(
    `/api/admin/registrations/${encodeURIComponent(String(registrationId))}`,
  );

  return unwrapData<RegistrationDetails>(response.data);
}

export async function getRegistrationRoles(): Promise<
  RegistrationRole[]
> {
  const response = await api.get(
    "/api/admin/registrations/meta/roles",
  );

  return extractArray<RegistrationRole>(
    unwrapData<unknown>(response.data),
    ["roles"],
  );
}

export async function getRegistrationPermissions(): Promise<
  RegistrationPermission[]
> {
  const response = await api.get(
    "/api/admin/registrations/meta/permissions",
  );

  return extractArray<RegistrationPermission>(
    unwrapData<unknown>(response.data),
    ["permissions"],
  );
}

export async function getRoleDefaultPermissions(
  roleId: string | number,
): Promise<AccessOption[]> {
  const response = await api.get(
    `/api/roles/${encodeURIComponent(String(roleId))}/permissions`,
  );
  return extractArray<AccessOption>(
    unwrapData<unknown>(response.data),
    ["permissions"],
  );
}

export async function reviewRegistrationRequest(
  registrationId: string | number,
  decision: "approved" | "rejected",
  roleIds: number[],
  permissionIds: number[],
  reason?: string,
): Promise<RegistrationReviewResult> {
  const response = await api.patch(
    `/api/admin/registrations/${encodeURIComponent(String(registrationId))}/review`,
    {
      decision,
      roleIds,
      permissionIds,
      reason,
    },
  );

  const result = unwrapData<unknown>(response.data);

  if (
    result !== null &&
    typeof result === "object"
  ) {
    const body = result as {
      ok?: boolean;
      success?: boolean;
      message?: string;
    };

    if (body.ok === false || body.success === false) {
      return {
        ok: false,
        message: body.message ?? "Unable to review registration.",
      };
    }

    return {
      ok: true,
      message: body.message,
    };
  }

  throw new Error("The API returned an unexpected registration review response.");
}

export const adminRegistrationApi = {
  async list(status?: RegistrationStatus) {
    return { data: await getRegistrationRequests(status) };
  },

  async get(registrationId: string | number) {
    return {
      data: await getRegistrationDetails(registrationId),
    };
  },

  async roles() {
    return {
      data: await getRegistrationRoles(),
    };
  },

  async permissions() {
    return {
      data: await getRegistrationPermissions(),
    };
  },

  async review(
    registrationId: string | number,
    payload: RegistrationReviewPayload,
  ): Promise<RegistrationReviewResult> {
    return reviewRegistrationRequest(
      registrationId,
      payload.decision,
      payload.roleIds,
      payload.permissionIds,
      payload.reason,
    );
  },
};

/* =========================================================
   APPLICATION MANAGEMENT API
========================================================= */

export async function getApplications(): Promise<AdminApplication[]> {
  const registrations = await getRegistrationRequests("pending");

  return registrations.map((registration) => ({
    id: registration.id,
    applicationReference: String(registration.id),
    applicantName:
      registration.applicantName ??
      registration.full_name ??
      "Unknown",
    email: registration.email ?? "",
    status:
      registration.status ??
      registration.account_status ??
      "pending",
    submittedAt:
      registration.submittedAt ??
      registration.created_at ??
      null,
  }));
}

/* =========================================================
   USER MANAGEMENT API
========================================================= */

/**
 * Fetch users from the backend.
 */
export async function getUsers(): Promise<AdminUser[]> {
  const response = await api.get("/api/users");

  const payload = unwrapData<unknown>(response.data);

  return extractArray<AdminUser>(payload, ["users"]);
}

/**
 * Activate or deactivate a user.
 */
export async function updateUserStatus(
  userId: string | number,
  status: string,
): Promise<void> {
  await api.patch(
    `/api/users/${encodeURIComponent(String(userId))}/status`,
    { status },
  );
}

/**
 * Assign roles to a user.
 */
/**
 * Replace roles for an already-approved user.
 */
export async function assignRole(
  userId: string | number,
  roles: string[],
): Promise<void> {
  await api.put(
    `/api/users/${encodeURIComponent(String(userId))}/roles`,
    { roles },
  );
}

export async function getUserAccess(userId: string | number) {
  const response = await api.get(
    `/api/users/${encodeURIComponent(String(userId))}/access`,
  );
  return unwrapData<{
    userId: string | number;
    roles: AccessOption[];
    roleIds: number[];
    overrides: (AccessOption & { effect: "grant" | "deny" })[];
    effectivePermissions: AccessOption[];
    permissionIds: number[];
  }>(response.data);
}

export async function saveUserAccess(
  userId: string | number,
  roleIds: number[],
  permissionIds: number[],
) {
  const response = await api.put(
    `/api/users/${encodeURIComponent(String(userId))}/access`,
    { roleIds, permissionIds },
  );
  return unwrapData<{
    userId: string | number;
    roleIds: number[];
    permissionIds: number[];
    effectivePermissions: AccessOption[];
  }>(response.data);
}

export const accessManagementApi = {
  async listRoles() {
    const response = await api.get("/api/roles");
    return extractArray<AccessOption>(unwrapData<unknown>(response.data), ["roles"]);
  },
  async createRole(payload: { name: string; code?: string; description?: string }) {
    const response = await api.post("/api/roles", payload);
    return unwrapData<AccessOption>(response.data);
  },
  async updateRole(
    id: number,
    payload: { name?: string; description?: string | null; isActive?: boolean },
  ) {
    const response = await api.put(`/api/roles/${id}`, payload);
    return unwrapData<AccessOption>(response.data);
  },
  async deleteRole(id: number) {
    await api.delete(`/api/roles/${id}`);
  },
  async getRolePermissions(id: number) {
    return getRoleDefaultPermissions(id);
  },
  async updateRolePermissions(id: number, permissionIds: number[]) {
    const response = await api.put(`/api/roles/${id}/permissions`, { permissionIds });
    return extractArray<AccessOption>(unwrapData<unknown>(response.data), ["permissions"]);
  },
  async listPermissions() {
    const response = await api.get("/api/permissions");
    return extractArray<AccessOption>(unwrapData<unknown>(response.data), ["permissions"]);
  },
  async listModules() {
    const response = await api.get("/api/permissions/modules");
    return extractArray<PermissionModule>(unwrapData<unknown>(response.data), ["modules"]);
  },
  async createModule(payload: { name: string; key?: string; description?: string }) {
    const response = await api.post("/api/permissions/modules", payload);
    return unwrapData<PermissionModule>(response.data);
  },
  async updateModule(
    id: number,
    payload: { name?: string; description?: string | null; isActive?: boolean },
  ) {
    const response = await api.put(`/api/permissions/modules/${id}`, payload);
    return unwrapData<PermissionModule>(response.data);
  },
  async deleteModule(id: number) {
    await api.delete(`/api/permissions/modules/${id}`);
  },
  async createPermission(payload: {
    key: string;
    name: string;
    moduleId: number;
    description?: string;
  }) {
    const response = await api.post("/api/permissions", payload);
    return unwrapData<AccessOption>(response.data);
  },
  async updatePermission(
    id: number,
    payload: {
      key?: string;
      name?: string;
      moduleId?: number;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    const response = await api.put(`/api/permissions/${id}`, payload);
    return unwrapData<AccessOption>(response.data);
  },
};
