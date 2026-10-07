import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const formatStoragePath = (path: string) => `/storage/media/${path}`

export function buildUrl(
  baseUrl: string,
  params?: Record<string, string | number | undefined | null | boolean>,
): string {
  const query = new URLSearchParams();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    }
  }

  const queryString = query.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}