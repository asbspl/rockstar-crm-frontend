import { createContext } from "react";

export type AuthContextValue = {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);