export const env = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD
      ? "https://test.asbspl.com"
      : "http://localhost:3000"),
} as const;