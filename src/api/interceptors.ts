import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { storageService } from "../services/storage.service";
import { normalizeApiError } from "./error-handler";

const ACCESS_TOKEN_KEY = "rockstar_access_token";

function getStoredToken(): string | null {
  return storageService.get(ACCESS_TOKEN_KEY);
}

export function attachApiInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeApiError(error)),
  );
}