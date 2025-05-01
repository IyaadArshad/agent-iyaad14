import { NextRequest, NextResponse } from 'next/server';

// Keep track of current OpenAI request IDs that need to be canceled
// This is a simple in-memory store - for production you might want 
// to use a more persistent solution
const activeRequestIds: Set<string> = new Set();

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

export async function POST(request: NextRequest) {
  try {
    // In a real implementation, you might have a request ID passed
    // from the client to identify which specific request to cancel
    
    // For our simple implementation, we'll just clear all active requests
    // which effectively marks all pending requests as "should be canceled"
    activeRequestIds.clear();
    
    return NextResponse.json({ success: true, message: "Stop signal sent" });
  } catch (error) {
    console.error("Error in stop handler:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error processing stop request" 
      }, 
      { status: 500 }
    );
  }
}