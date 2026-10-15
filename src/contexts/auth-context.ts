import { createContext } from "react";

export type AuthUser = {
  id: number | string;
  email: string;
  full_name?: string | null;
  name?: string | null;
  status?: string;
  roles: string[];
  permissions: string[];
};

export type AuthState =
  | "initializing"
  | "unauthenticated"
  | "authenticated"
  | "pending"
  | "rejected"
  | "suspended"
  | "forbidden";

export type AuthContextValue = {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  authState: AuthState;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: readonly string[]) => boolean;
  hasAllPermissions: (permissions: readonly string[]) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);