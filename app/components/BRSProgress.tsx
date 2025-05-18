import { useCallback, useEffect, useState } from "react";

// Progress status types
export type ProgressStep = {
  id: string;
  label: string;
  status: "waiting" | "processing" | "completed" | "failed";
  startTime?: number;
  endTime?: number;
};

// Progress bar component for BRS document generation process
export function BRSProgressTracker({
  steps,
  currentStepId,
  isVisible,
}: {
  steps: ProgressStep[];
  currentStepId: string | null;
  isVisible: boolean;
}) {
  // Track completion percentage
  const [overallProgress, setOverallProgress] = useState(0);

  // Define the exact step order we want to show
  const orderedStepIds = [
    "upload",
    "convert",
    "filename",
    "save",
    "overview",
    "improve",
    "final-save",
  ];

  // Update overall progress when steps or current step changes
  useEffect(() => {
    if (!isVisible) return;

    // Get ordered steps that we actually have
    const relevantSteps = orderedStepIds.filter((id) =>
      steps.some((s) => s.id === id)
    );

    // Count completed steps in our order
    const completedSteps = relevantSteps.filter((id) =>
      steps.some((s) => s.id === id && s.status === "completed")
    ).length;

    const failedSteps = steps.filter((s) => s.status === "failed").length;
    const inProgressStep = steps.find((s) => s.id === currentStepId);

    // Base progress on completed steps
    const totalSteps = relevantSteps.length;
    let progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Add partial progress for the current in-progress step
    if (inProgressStep && inProgressStep.status === "processing") {
      // Add partial credit for the in-progress step
      progress += (1 / steps.length) * 50;
    }

    // If we have failed steps, ensure progress doesn't reach 100%
    if (failedSteps > 0) {
      const maxProgressWithFailures =
        ((steps.length - failedSteps) / steps.length) * 100;
      progress = Math.min(progress, maxProgressWithFailures);
    } else {
      progress = Math.min(progress, 99); // Cap at 99% until fully complete
    }

    setOverallProgress(progress);
  }, [steps, currentStepId, isVisible]);

  // When all steps are completed, jump to 100%
  useEffect(() => {
    if (steps.every((s) => s.status === "completed")) {
      setOverallProgress(100);
    }
  }, [steps]);

  if (!isVisible) return null;

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-xl p-6 shadow-lg border border-[#1A479D]/20">
      <h3 className="text-xl font-semibold mb-4 text-[#1A479D]">
        Import BRS from Document
      </h3>

      {/* Overall progress bar */}
      <div className="mb-6">
        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1A479D] to-blue-400 transition-all duration-500 ease-in-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="text-sm text-gray-600 flex justify-between mt-2">
          <span>Progress</span>
          <span className="font-medium">
            {Math.round(overallProgress)}% complete
          </span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100"
          >
            <div className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                  step.status === "completed"
                    ? "bg-green-500 text-white"
                    : step.status === "processing"
                    ? "bg-[#1A479D] text-white animate-pulse"
                    : step.status === "failed"
                    ? "bg-red-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step.status === "completed" && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {step.status === "processing" && (
                  <svg
                    className="w-4 h-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {step.status === "failed" && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${
                    step.status === "completed"
                      ? "text-gray-800"
                      : step.status === "processing"
                      ? "text-[#1A479D]"
                      : step.status === "failed"
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {step.label}
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {step.status === "completed" &&
                  step.endTime &&
                  step.startTime &&
                  `${Math.max(
                    2,
                    (step.endTime - step.startTime) / 1000
                  ).toFixed(1)}s`}
                {step.status === "processing" &&
                  step.startTime &&
                  `${Math.max(2, (Date.now() - step.startTime) / 1000).toFixed(
                    1
                  )}s...`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook to use the progress tracker
export function useBRSProgress() {
  // Define the standard BRS creation steps in the exact order specified
  const defaultSteps: ProgressStep[] = [
    { id: "upload", label: "Upload file", status: "waiting" },
    { id: "convert", label: "Parse PDF to Markdown", status: "waiting" },
    { id: "filename", label: "Generate file name", status: "waiting" },
    { id: "save", label: "Create file", status: "waiting" },
    { id: "overview", label: "Plan overview", status: "waiting" },
    { id: "improve", label: "Generate content", status: "waiting" },
    { id: "final-save", label: "Save to file", status: "waiting" },
  ];

  const [steps, setSteps] = useState<ProgressStep[]>(defaultSteps);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Start a specific step
  const startStep = useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, status: "processing", startTime: Date.now() }
          : step
      )
    );
    setCurrentStepId(stepId);
    setIsVisible(true);
  }, []);

  // Complete a step with minimum display time
  const completeStep = useCallback((stepId: string) => {
    setSteps((prevSteps) => {
      // Find the current step in the latest state
      const step = prevSteps.find((s) => s.id === stepId);
      if (!step || step.status !== "processing") {
        return prevSteps.map((s) =>
          s.id === stepId
            ? { ...s, status: "completed", endTime: Date.now() }
            : s
        );
      }

      // Calculate how long the step has been processing
      const startTime = step.startTime || Date.now();
      const elapsed = Date.now() - startTime;
      const MIN_STEP_DURATION = 2500; // 2.5 seconds minimum

      if (elapsed >= MIN_STEP_DURATION) {
        // If it's been displayed long enough, complete immediately
        return prevSteps.map((s) =>
          s.id === stepId
            ? { ...s, status: "completed", endTime: Date.now() }
            : s
        );
      } else {
        // Otherwise, wait until minimum time has elapsed
        const delay = MIN_STEP_DURATION - elapsed;
        setTimeout(() => {
          setSteps((latestSteps) =>
            latestSteps.map((s) =>
              s.id === stepId
                ? { ...s, status: "completed", endTime: Date.now() }
                : s
            )
          );
        }, delay);
        return prevSteps; // Return unchanged state for now
      }
    });
  }, []);

  // Fail a step
  const failStep = useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, status: "failed", endTime: Date.now() }
          : step
      )
    );
  }, []);

  // Reset all steps
  const resetProgress = useCallback(() => {
    setSteps(defaultSteps);
    setCurrentStepId(null);
    setIsVisible(false);
  }, []);

  return {
    steps,
    currentStepId,
    isVisible,
    startStep,
    completeStep,
    failStep,
    resetProgress,
    hideProgress: () => setIsVisible(false),
    showProgress: () => setIsVisible(true),
    progressTracker: (
      <BRSProgressTracker
        steps={steps}
        currentStepId={currentStepId}
        isVisible={isVisible}
      />
    ),
  };
}