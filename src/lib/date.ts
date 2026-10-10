export function formatDate(value: string | number | Date): string {
  return new Intl.DateTimeFormat().format(new Date(value));
}