
import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import axios from "axios";
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

export function attachApiInterceptors(client: AxiosInstance): void {
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
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/register") ||
        requestUrl.includes("/auth/refresh") ||
        requestUrl.includes("/auth/logout");

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
          refreshPromise = axios
            .post<RefreshResponse>(
              `${client.defaults.baseURL ?? ""}/api/auth/refresh`,
              {},
              { withCredentials: true },
            )
            .then((response) => {
              const token = response.data.accessToken;

              if (!token) {
                throw new Error(
                  "The refresh endpoint did not return an access token.",
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

        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return client(originalRequest);
      } catch (refreshError) {
        storageService.remove(ACCESS_TOKEN_KEY);

        // Let the existing authentication context handle session expiry.
        window.dispatchEvent(new CustomEvent("auth:session-expired"));

        return Promise.reject(normalizeApiError(refreshError));
      }
    },
  );
}
