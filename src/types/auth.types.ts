import type { Identifier } from "./common.types";

export type AuthUser = {
  id: Identifier;
  name?: string | null;
  full_name?: string | null;
  email: string;
  status?: string;
  roles?: string[];
  permissions?: string[];
};

export type AuthSession = {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  permissions?: string[];
  roles?: string[];
  status?: string;
};

export type AuthApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};