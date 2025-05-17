import { useCallback, useRef } from 'react';

// Minimum duration for each step in milliseconds (2.5 seconds)
const MIN_STEP_DURATION = 2500;

/**
 * Hook to enforce minimum durations for progress steps
 */
export function useStepTimer() {
  // Track step start times
  const stepTimers = useRef<Map<string, number>>(new Map());
  
  /**
   * Calculate if enough time has passed for a step
   * @param stepId The ID of the step to check
   * @returns Whether enough time has passed for the step to complete
   */
  const hasMinimumTimeElapsed = (stepId: string): boolean => {
    const startTime = stepTimers.current.get(stepId);
    if (!startTime) return true;
    
    const elapsed = Date.now() - startTime;
    return elapsed >= MIN_STEP_DURATION;
  };
  
  /**
   * Register the start of a step
   * @param stepId The ID of the step being started
   */
  const startStepTimer = useCallback((stepId: string) => {
    stepTimers.current.set(stepId, Date.now());
  }, []);
  
  /**
   * Create a promise that resolves when minimum time has elapsed
   * @param stepId The ID of the step to check
   * @returns A promise that resolves after the minimum display time has elapsed
   */
  const waitForMinimumTime = useCallback((stepId: string): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = stepTimers.current.get(stepId);
      if (!startTime) {
        resolve();
        return;
      }
      
      const elapsed = Date.now() - startTime;
      if (elapsed >= MIN_STEP_DURATION) {
        resolve();
      } else {
        const remainingTime = MIN_STEP_DURATION - elapsed;
        setTimeout(() => resolve(), remainingTime);
      }
    });
  }, []);
  
  return {
    startStepTimer,
    hasMinimumTimeElapsed,
    waitForMinimumTime
  };
}
