import { NextRequest, NextResponse } from "next/server";
import { activeRequestIds } from "../../../../lib/activeRequests"; // Import from the new utility file

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
        error:
          error instanceof Error
            ? error.message
            : "Unknown error processing stop request",
      },
      { status: 500 }
    );
  }
}