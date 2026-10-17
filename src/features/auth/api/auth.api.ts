import api from "../../../api/client";
import { storageService } from "../../../services/storage.service";
import type {
  AuthApiResponse,
  AuthSession,
  AuthUser,
  RegistrationStatusRecord,
} from "../types/auth.types";

const ACCESS_TOKEN_KEY = "rockstar_access_token";
const REFRESH_TOKEN_KEY = "rockstar_refresh_token";
let refreshRequest: Promise<AuthSession> | null = null;

function extractData<T>(response: { data?: unknown }): T {
  const payload = response.data;

  if (!payload || typeof payload !== "object") {
    throw new Error("Authentication response is invalid.");
  }

  const envelope = payload as Record<string, unknown>;

  if ("data" in envelope && envelope.data !== undefined) {
    return envelope.data as T;
  }

  if ("user" in envelope && envelope.user !== undefined) {
    return payload as T;
  }

  return payload as T;
}



function extractSessionFromPayload(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const user = payload.user && typeof payload.user === "object" ? (payload.user as AuthUser) : undefined;

  const session: AuthSession = {
    token: typeof payload.token === "string" ? payload.token : undefined,
    accessToken:
      typeof payload.accessToken === "string"
        ? payload.accessToken
        : typeof payload.access_token === "string"
          ? payload.access_token
          : undefined,
    refreshToken:
      typeof payload.refreshToken === "string"
        ? payload.refreshToken
        : typeof payload.refresh_token === "string"
          ? payload.refresh_token
          : undefined,
    user,
    permissions: Array.isArray(payload.permissions) ? (payload.permissions as string[]) : undefined,
    roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : undefined,
    status: typeof payload.status === "string" ? payload.status : user?.status,
  };

  if (!session.token && !session.accessToken && session.user) {
    return session;
  }

  return session;
}

function normalizeUserProfile(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const user = value as Record<string, unknown>;
  const email = typeof user.email === "string" ? user.email.trim() : "";
  const id = user.id;

  if ((!id && id !== 0) || !email) {
    return null;
  }

  const permissions = Array.isArray(user.permissions)
    ? user.permissions.filter((entry): entry is string => typeof entry === "string")
    : [];
  const roles = Array.isArray(user.roles)
    ? user.roles.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    id: String(id),
    email,
    full_name:
      typeof user.full_name === "string"
        ? user.full_name
        : typeof user.name === "string"
          ? user.name
          : null,
    name:
      typeof user.name === "string"
        ? user.name
        : typeof user.full_name === "string"
          ? user.full_name
          : null,
    status: typeof user.status === "string" ? user.status : "active",
    roles,
    permissions,
  };
}

export function getAccessToken(): string | null {
  return storageService.get(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (!token) {
    storageService.remove(ACCESS_TOKEN_KEY);
    return;
  }

  storageService.set(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  storageService.remove(ACCESS_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (!token) {
    storageService.removeSession(REFRESH_TOKEN_KEY);
    return;
  }

  storageService.setSession(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return storageService.getSession(REFRESH_TOKEN_KEY);
}

export function clearRefreshToken(): void {
  storageService.removeSession(REFRESH_TOKEN_KEY);
}

export async function registerUser(payload: FormData): Promise<{ reference?: string; status?: string; message?: string }> {
  const response = await api.post<AuthApiResponse<{ reference?: string; status?: string; message?: string }>>("/api/auth/register", payload);
  const result = extractData<{ reference?: string; status?: string; message?: string }>(response);

  return result ?? {};
}

export async function loginWithEmail(email: string, password: string): Promise<AuthSession> {
  const response = await api.post<AuthApiResponse<unknown>>("/api/auth/login", {
    email,
    password,
  });

  const payload = extractData<unknown>(response);
  const session = extractSessionFromPayload(payload) ?? {
    accessToken: typeof (payload as Record<string, unknown>)?.accessToken === "string" ? String((payload as Record<string, unknown>).accessToken) : undefined,
    token: typeof (payload as Record<string, unknown>)?.token === "string" ? String((payload as Record<string, unknown>).token) : undefined,
    refreshToken: typeof (payload as Record<string, unknown>)?.refreshToken === "string" ? String((payload as Record<string, unknown>).refreshToken) : undefined,
  };

  const accessToken = session.accessToken ?? session.token;

  if (typeof accessToken !== "string" || !accessToken.trim()) {
    throw new Error("Login response did not include a valid access token.");
  }

  setAccessToken(accessToken);
  setRefreshToken(session.refreshToken ?? null);

  return { ...session, token: accessToken, accessToken };
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<AuthApiResponse<unknown>>("/api/auth/me");
  const payload = extractData<unknown>(response);
  const user =
    normalizeUserProfile(payload) ??
    normalizeUserProfile((payload as Record<string, unknown>)?.user) ??
    normalizeUserProfile((payload as Record<string, unknown>)?.data) ??
    normalizeUserProfile((payload as Record<string, unknown>)?.profile);

  if (!user?.email) {
    throw new Error("Current user profile is missing required data.");
  }

  return user;
}

async function requestRefreshSession(): Promise<AuthSession> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token is available to renew the session.");
  }

  const response = await api.post<AuthApiResponse<unknown>>("/api/auth/refresh", {
    refreshToken,
  });

  const payload = extractData<unknown>(response);
  const session = extractSessionFromPayload(payload) ?? {
    accessToken: typeof (payload as Record<string, unknown>)?.accessToken === "string" ? String((payload as Record<string, unknown>).accessToken) : undefined,
    token: typeof (payload as Record<string, unknown>)?.token === "string" ? String((payload as Record<string, unknown>).token) : undefined,
    refreshToken: typeof (payload as Record<string, unknown>)?.refreshToken === "string" ? String((payload as Record<string, unknown>).refreshToken) : undefined,
  };

  const accessToken = session.accessToken ?? session.token;

  if (typeof accessToken !== "string" || !accessToken.trim()) {
    throw new Error("Refresh response did not include a valid access token.");
  }

  setAccessToken(accessToken);
  setRefreshToken(session.refreshToken ?? refreshToken);

  return { ...session, token: accessToken, accessToken };
}

export function refreshSession(): Promise<AuthSession> {
  if (!refreshRequest) {
    refreshRequest = requestRefreshSession().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

export async function logoutSession(): Promise<void> {
  const refreshToken = getRefreshToken();

  try {
    await api.post("/api/auth/logout", refreshToken ? { refreshToken } : {});
  } catch {
    // Ignore server-side logout failures while clearing the client session.
  } finally {
    clearAccessToken();
    clearRefreshToken();
  }
}


export async function requestPasswordReset(
  email: string
): Promise<{ requested: boolean }> {
  const response = await api.post<AuthApiResponse<{ requested?: boolean }>>(
    "/api/auth/request-password-reset",
    { email: email.trim() }
  );

  const payload = extractData<{ requested?: boolean }>(response);
  console.log("payload ", payload);
  return {
    requested: payload?.requested ?? true,
  };
}

export async function resetPassword(
  token: string,
  password: string
): Promise<{ reset: boolean; message: string }> {
  const response = await api.post<AuthApiResponse<{ reset?: boolean }>>(
    "/api/auth/reset-password",
    { token, password }
  );

  const body = response.data as { message?: string } | undefined;

  return {
    reset: true,
    message: body?.message ?? "Password reset successful",
  };
}

export async function getRegistrationStatus(): Promise<RegistrationStatusRecord> {
  const response = await api.get<AuthApiResponse<RegistrationStatusRecord> | RegistrationStatusRecord>("/api/auth/registration-status");

  const data = (response.data && typeof response.data === "object" && "data" in response.data
    ? response.data.data
    : response.data) as RegistrationStatusRecord | undefined;

  if (!data || typeof data !== "object") {
    throw new Error("Registration status response is missing application details.");
  }

  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ changed: boolean }> {
  const response = await api.post<AuthApiResponse<{ changed?: boolean }>>("/api/auth/change-password", {
    currentPassword,
    newPassword,
  });

  const payload = extractData<{ changed?: boolean }>(response);
  return { changed: payload?.changed ?? true };
}


