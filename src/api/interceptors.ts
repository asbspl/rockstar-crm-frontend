
import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { storageService } from "../services/storage.service";
import { normalizeApiError } from "./error-handler";

const ACCESS_TOKEN_KEY = "rockstar_access_token";

type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = {
  accessToken: string;
};

let refreshPromise: Promise<string> | null = null;

function getStoredToken(): string | null {
  return storageService.get(ACCESS_TOKEN_KEY);
}

function saveToken(token: string): void {
  storageService.set(ACCESS_TOKEN_KEY, token);
}

export function attachApiInterceptors(
  client: AxiosInstance,
): void {
  client.interceptors.request.use((config) => {
    const token = getStoredToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | RetryableRequest
        | undefined;

      const requestUrl = originalRequest?.url ?? "";

      const isAuthRequest =
        /\/auth\/(login|register|refresh|logout)(?:[/?]|$)/i.test(
          requestUrl,
        );

      if (
        error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        isAuthRequest
      ) {
        return Promise.reject(normalizeApiError(error));
      }

      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          const baseURL = client.defaults.baseURL ?? "";

          // Supports either:
          // http://localhost:3000/api
          // http://localhost:3000
          const refreshPath = /\/api\/?$/.test(baseURL)
            ? "/auth/refresh"
            : "/api/auth/refresh";

          refreshPromise = client
            .post<RefreshResponse>(
              refreshPath,
              {},
              { withCredentials: true },
            )
            .then((response) => {
              const token = response.data.accessToken;

              if (!token) {
                throw new Error(
                  "Refresh endpoint did not return an access token.",
                );
              }

              saveToken(token);
              return token;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;

        originalRequest.headers.set(
          "Authorization",
          `Bearer ${newToken}`,
        );

        return client(originalRequest);
      } catch (refreshError) {
        storageService.remove(ACCESS_TOKEN_KEY);

        window.dispatchEvent(
          new CustomEvent("auth:session-expired"),
        );

        return Promise.reject(
          normalizeApiError(refreshError),
        );
      }
    },
  );
}
