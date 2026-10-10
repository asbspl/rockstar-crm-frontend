import type { AxiosInstance } from "axios";
import { normalizeApiError } from "./error-handler";

export function attachApiInterceptors(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeApiError(error)),
  );
}