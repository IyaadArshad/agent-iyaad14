import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Define RecentDocument type
export interface RecentDocument {
  id: string;
  name: string;
  lastOpened: Date;
}

// Constants for localStorage keys
const RECENT_DOCUMENTS_KEY = "recentDocuments";
const MAX_RECENT_DOCUMENTS = 3;

/**
 * Get recent documents from localStorage
 * @returns Array of recent documents
 */
export function getRecentDocuments(): RecentDocument[] {
  try {
    const storedDocuments = localStorage.getItem(RECENT_DOCUMENTS_KEY);
    if (!storedDocuments) return [];
    
    // Parse and convert string dates to Date objects
    return JSON.parse(storedDocuments).map((doc: any) => ({
      ...doc,
      lastOpened: new Date(doc.lastOpened)
    }));
  } catch (error) {
    console.error("Failed to retrieve recent documents:", error);
    return [];
  }
}

/**
 * Add a document to recent documents in localStorage
 * @param document Document to add to recents
 */
export function addRecentDocument(document: RecentDocument): void {
  try {
    // Get current documents
    let documents = getRecentDocuments();
    
    // Remove if it already exists (to avoid duplicates)
    documents = documents.filter(doc => doc.id !== document.id);
    
    // Add to the beginning of the array (most recent first)
    documents.unshift({
      ...document,
      lastOpened: new Date() // Update the last opened time to now
    });
    
    // Limit to max number of documents
    if (documents.length > MAX_RECENT_DOCUMENTS) {
      documents = documents.slice(0, MAX_RECENT_DOCUMENTS);
    }
    
    // Save to localStorage
    localStorage.setItem(RECENT_DOCUMENTS_KEY, JSON.stringify(documents));
  } catch (error) {
    console.error("Failed to save recent document:", error);
  }
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