import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomHash(length = 8): string {
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

  if (trimmedUrl.startsWith('//')) {
    return trimmedUrl; // It's a protocol-relative URL, leave it as is
  }

  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  
  // Check for other common schemes like mailto:, tel:, ftp:, file:
  const protocolPart = trimmedUrl.split(':')[0];
  if (protocolPart.length > 1 && /^[a-z][a-z0-9+.-]*$/i.test(protocolPart)) {
      // Likely a URI with a scheme already
      return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}
