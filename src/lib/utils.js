import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function toDisplayString(str) {
  if (str === null || str === undefined) {
    return "";
  }
  if (typeof str !== 'string') {
    return String(str);
  }
  const result = str.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}
