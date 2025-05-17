// Utility functions for streaming progress updates in the BRS generation process
export interface ProgressUpdate {
  stepId: string;
  status: "started" | "completed" | "failed";
  message: string;
  timestamp: number;
  // Extend with any additional information needed
}

export interface StreamingData {
  type: "progress" | "result" | "error";
  data: ProgressUpdate | any;
}

// Convert data to a format suitable for SSE streaming
export function formatSSE(data: StreamingData): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Enforce minimum step durations for better UX - returns a promise that resolves
// after waiting the appropriate amount of time
export async function enforceMinStepDuration(
  stepId: string,
  stepStartTimes: Map<string, number>,
  minDurationMs: number = 3000 // Increased to 3 seconds for better visibility
): Promise<void> {
  const startTime = stepStartTimes.get(stepId);
  if (!startTime) return;
  
  const elapsed = Date.now() - startTime;
  if (elapsed < minDurationMs) {
    // If less than minimum time has passed, wait for the remainder
    await new Promise(resolve => setTimeout(resolve, minDurationMs - elapsed));
    console.log(`BRS Improve: Enforced minimum duration for step ${stepId}: ${minDurationMs}ms`);
  }
}
