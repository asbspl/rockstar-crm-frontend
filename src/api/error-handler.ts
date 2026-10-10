import axios from "axios";

export function normalizeApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === "string") {
      return new Error(responseMessage, { cause: error });
    }

    return new Error(error.message, { cause: error });
  }

  return error instanceof Error ? error : new Error(String(error));
}