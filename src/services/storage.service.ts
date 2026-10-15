export const storageService = {
  get(key: string): string | null {
    return window.localStorage.getItem(key);
  },
  set(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  },
  remove(key: string): void {
    window.localStorage.removeItem(key);
  },
  getSession(key: string): string | null {
    return window.sessionStorage.getItem(key);
  },
  setSession(key: string, value: string): void {
    window.sessionStorage.setItem(key, value);
  },
  removeSession(key: string): void {
    window.sessionStorage.removeItem(key);
  },
};