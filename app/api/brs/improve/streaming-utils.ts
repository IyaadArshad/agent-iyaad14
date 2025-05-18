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
  stepStartTimes: Map<string, number>
): Promise<void> {
  // Minimum durations for different steps (in milliseconds)
  const minDurations: Record<string, number> = {
    upload: 800,
    convert: 2500,
    analyze: 1200,
    topics: 2000, // New step for topic extraction
    filename: 1500,
    save: 1000,
    overview: 3000,
    improve: 4000,
    "final-save": 1500,
  };

  const startTime = stepStartTimes.get(stepId);
  if (!startTime) return;
  
  const elapsed = Date.now() - startTime;
  const minDurationMs = minDurations[stepId] || 3000; // Default to 3 seconds if step not found
  if (elapsed < minDurationMs) {
    // If less than minimum time has passed, wait for the remainder
    await new Promise(resolve => setTimeout(resolve, minDurationMs - elapsed));
    console.log(`BRS Improve: Enforced minimum duration for step ${stepId}: ${minDurationMs}ms`);
  }
}
