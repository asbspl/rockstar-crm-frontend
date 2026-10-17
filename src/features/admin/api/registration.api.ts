const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export type RegistrationStatus = "pending" | "approved" | "rejected";

export interface Registration {
  id: number;
  full_name: string;
  phone?: string | null;
  email: string;
  status: string;
  account_status: RegistrationStatus;
  created_at: string;
  roles?: { id: number; name: string }[];
  profile?: Record<string, unknown> | null;
  kyc?: Record<string, unknown> | null;
  bank?: Record<string, unknown> | null;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface Permission {
  id: number;
  code: string;
  description?: string;
}

function getToken(): string {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  return token;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || `Request failed (${response.status}).`
    );
  }

  return result as T;
}

export const registrationApi = {
  async list(status: RegistrationStatus) {
    return request<{ success: boolean; data: Registration[] }>(
      `/admin/registrations?status=${status}`
    );
  },

  async getById(id: number) {
    return request<{ success: boolean; data: Registration }>(
      `/admin/registrations/${id}`
    );
  },

  async getRoles() {
    return request<{ success: boolean; data: Role[] }>("/roles");
  },

  async getPermissions() {
    return request<{ success: boolean; data: Permission[] }>(
      "/permissions"
    );
  },

  async review(
    id: number,
    payload: {
      decision: "approved" | "rejected";
      reason?: string;
      roleIds?: number[];
      permissionCodes?: string[];
    }
  ) {
    return request<{ success: boolean; message: string }>(
      `/admin/registrations/${id}/review`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },
};