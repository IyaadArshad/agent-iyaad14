import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  // Add ordinal suffix to day (1st, 2nd, 3rd, etc.)
  let suffix = "th";
  if (day % 10 === 1 && day !== 11) suffix = "st";
  if (day % 10 === 2 && day !== 12) suffix = "nd";
  if (day % 10 === 3 && day !== 13) suffix = "rd";

  return `${month} ${day}${suffix}, ${year}`;
}