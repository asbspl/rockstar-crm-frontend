import type { Identifier } from "./common.types";

export type AuthUser = {
  id: Identifier;
  name: string;
  email: string;
};