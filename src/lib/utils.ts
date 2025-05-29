import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomHash(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}
