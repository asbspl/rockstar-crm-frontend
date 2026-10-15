import axios from "axios";

function getResponseMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const response = data as Record<string, unknown>;

  for (const key of ["message", "error", "detail", "title"]) {
    const value = response[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  if (response.data && typeof response.data === "object") {
    return getResponseMessage(response.data);
  }

  return null;
}

export function normalizeApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseMessage = getResponseMessage(error.response?.data) ?? error.message;
    return new Error(responseMessage, { cause: error });
  }

  return error instanceof Error ? error : new Error(String(error));
}

export function getApiErrorStatus(error: unknown): number | null {
  if (!(error instanceof Error) || !axios.isAxiosError(error.cause)) {
    return null;
  }

  return error.cause.response?.status ?? null;
}