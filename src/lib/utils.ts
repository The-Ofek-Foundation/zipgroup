import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomHash(length = 8): string {
  if (length <= 0) return "";
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Prepends 'https://' to a URL if it doesn't already start with a common scheme or is protocol-relative.
 * @param url The URL string to normalize.
 * @returns The normalized URL string.
 */
export function normalizeUrl(url: string): string {
  if (!url) return "";
  const trimmedUrl = url.trim();

  // Check for common absolute schemes first
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  // Handle protocol-relative URLs
  if (trimmedUrl.startsWith('//')) {
    return trimmedUrl;
  }

  // Check for other URI schemes (e.g., mailto:, tel:, ftp:, file:, customscheme:)
  // A scheme must be followed by a colon, and the scheme itself must be valid.
  const colonIndex = trimmedUrl.indexOf(':');
  if (colonIndex > 0) { // Ensure colon is present and not the first character
    const potentialScheme = trimmedUrl.substring(0, colonIndex);
    // Basic scheme validation: starts with a letter, can contain letters, digits, +, ., -
    // This regex is a simplified version but covers most common cases.
    if (/^[a-z][a-z0-9+.-]*$/i.test(potentialScheme)) {
      return trimmedUrl; // It has a valid-looking scheme
    }
  }

  // If no scheme is found by the above checks, prepend https://
  return `https://${trimmedUrl}`;
}
