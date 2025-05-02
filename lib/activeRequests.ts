// lib/activeRequests.ts
export const activeRequestIds: Set<string> = new Set();

// Register an active request ID
export function registerRequest(requestId: string) {
  activeRequestIds.add(requestId);
}

// Remove a request ID when it's completed or canceled
export function removeRequest(requestId: string) {
  activeRequestIds.delete(requestId);
}

// Check if a request is marked for cancellation
export function shouldCancelRequest(requestId: string) {
  return !activeRequestIds.has(requestId);
}
