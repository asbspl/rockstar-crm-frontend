import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getApiErrorStatus } from "../api/error-handler";
import {
  clearAccessToken,
  clearRefreshToken,
  getAccessToken,
  getCurrentUser,
  loginWithEmail,
  logoutSession,
  refreshSession,
  setAccessToken,
  setRefreshToken,
} from "../features/auth/api/auth.api";
import type { AuthState, AuthUser } from "./auth-context";
import { AuthContext } from "./auth-context";

const EMPTY_PERMISSIONS: string[] = [];

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((entry: unknown) => {
      if (typeof entry === "string") return entry.trim();

      if (entry && typeof entry === "object") {
        const item = entry as Record<string, unknown>;

        for (const key of ["name", "code", "slug", "key", "permission"]) {
          if (typeof item[key] === "string") {
            return item[key].trim();
          }
        }
      }

      return "";
    })
    .filter(Boolean)
    .map((entry) => entry.toLowerCase());

  return Array.from(new Set(normalized));
}

function buildUserProfile(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") return null;

  const root = value as Record<string, unknown>;
  const nested =
    root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>)
      : root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : root;

  const candidate =
    nested.user && typeof nested.user === "object"
      ? (nested.user as Record<string, unknown>)
      : nested;

  const id = candidate.id;
  const email = typeof candidate.email === "string" ? candidate.email.trim() : "";

  if ((typeof id !== "string" && typeof id !== "number") || !email) {
    return null;
  }

  const status = typeof candidate.status === "string" ? candidate.status : "active";
  const name =
    typeof candidate.full_name === "string"
      ? candidate.full_name
      : typeof candidate.name === "string"
        ? candidate.name
        : null;

  const roles = normalizeStringList(candidate.roles);
  const permissions = normalizeStringList(candidate.permissions);

  return {
    id: String(id),
    email,
    full_name: name,
    name,
    status,
    roles,
    permissions,
  };
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>("initializing");

  const clearSession = useCallback(() => {
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setIsAuthenticated(false);
    setAuthState("unauthenticated");
    clearAccessToken();
    clearRefreshToken();
  }, []);

  const applyUser = useCallback((value: unknown) => {
    const nextUser = buildUserProfile(value);

    if (!nextUser) {
      throw new Error(
        "The current-user API returned an unexpected user response. Check GET /api/auth/me.",
      );
    }

    const normalizedStatus = (nextUser.status ?? "active").trim().toLowerCase();

    setUser(nextUser);
    setRoles(nextUser.roles ?? EMPTY_PERMISSIONS);
    setPermissions(nextUser.permissions ?? EMPTY_PERMISSIONS);
    setIsAuthenticated(true);
    setAuthState(
      normalizedStatus === "pending" || normalizedStatus === "pending_approval"
        ? "pending"
        : normalizedStatus === "rejected"
          ? "rejected"
          : normalizedStatus === "suspended"
            ? "suspended"
            : "authenticated",
    );
  }, []);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setAuthState("initializing");

    try {
      const token = getAccessToken();
      if (!token) {
        clearSession();
        return;
      }

      let currentUser: AuthUser;
      try {
        currentUser = await getCurrentUser();
      } catch (error) {
        if (getApiErrorStatus(error) !== 401) {
          throw error;
        }

        const refreshed = await refreshSession();
        const accessToken = refreshed.accessToken ?? refreshed.token;
        if (!accessToken) {
          throw new Error("Refresh response did not include an access token.");
        }

        setAccessToken(accessToken);
        setRefreshToken(refreshed.refreshToken ?? null);
        currentUser = await getCurrentUser();
      }

      applyUser(currentUser);
    } catch (error) {
      clearSession();
      console.warn("Authentication initialization failed; the local session was cleared.");
    } finally {
      setIsLoading(false);
    }
  }, [applyUser, clearSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      setIsLoading(true);

      try {
        const session = await loginWithEmail(email, password);
        const accessToken = session.accessToken ?? session.token ?? getAccessToken();

        if (!accessToken) {
          throw new Error("Login succeeded without an access token.");
        }

        setAccessToken(accessToken);
        setRefreshToken(session.refreshToken ?? null);

        const currentUser = await getCurrentUser();
        applyUser(currentUser);
        return currentUser;
      } catch (error) {
        clearSession();
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [applyUser, clearSession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refresh = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      clearSession();
      return;
    }

    setIsLoading(true);

    try {
      const session = await refreshSession();
      const accessToken = session.token ?? session.accessToken ?? token;

      setAccessToken(accessToken);
      setRefreshToken(session.refreshToken ?? null);

      const currentUser = await getCurrentUser();
      applyUser(currentUser);
    } catch (error) {
      clearSession();
      console.warn("Authentication refresh failed; the local session was cleared.");
    } finally {
      setIsLoading(false);
    }
  }, [applyUser, clearSession]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const value = useMemo(
    () => ({
      user,
      roles,
      permissions,
      isAuthenticated,
      isLoading,
      authState,
      setIsAuthenticated,
      login,
      logout,
      initialize,
      refreshSession: refresh,
      hasPermission: (permission: string) =>
        permissions.some(
          (item) =>
            item.trim().toLowerCase() === permission.trim().toLowerCase(),
        ),
      hasAnyPermission: (requiredPermissions: readonly string[]) =>
        requiredPermissions.some((permission) =>
          permissions.some(
            (item) =>
              item.trim().toLowerCase() === permission.trim().toLowerCase(),
          ),
        ),
      hasAllPermissions: (requiredPermissions: readonly string[]) =>
        requiredPermissions.every((permission) =>
          permissions.some(
            (item) =>
              item.trim().toLowerCase() === permission.trim().toLowerCase(),
          ),
        ),
    }),
    [authState, isAuthenticated, isLoading, initialize, login, logout, permissions, refresh, roles, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
