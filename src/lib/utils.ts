import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomHash(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Prepends 'https://' to a URL if it doesn't already start with 'http://' or 'https://'.
 * @param url The URL string to normalize.
 * @returns The normalized URL string.
 */
export function normalizeUrl(url: string): string {
  if (!url) return "";
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  // Also consider other common protocols or if it's a mailto: or tel: link
  if (trimmedUrl.startsWith('//') || trimmedUrl.includes(':')) {
    // If it starts with //, browsers treat it as protocol-relative, which is fine.
    // If it contains a colon but not at the start (e.g., mailto:), assume it's a special protocol.
    // This simple check might need refinement for more complex URI schemes.
    const protocolPart = trimmedUrl.split(':')[0];
    if (protocolPart.length > 1 && /^[a-z][a-z0-9+.-]*$/i.test(protocolPart)) {
        // Likely a URI with a scheme already (e.g., mailto:, ftp:, file:)
        return trimmedUrl;
    }
  }
  return `https://${trimmedUrl}`;
}
