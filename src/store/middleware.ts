export type AppMiddleware = (
  next: (action: unknown) => unknown,
) => (action: unknown) => unknown;

export const middleware: AppMiddleware[] = [];