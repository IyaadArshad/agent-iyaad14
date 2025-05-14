import { useCallback, useEffect, useState } from "react";

// Progress status types
export type ProgressStep = {
  id: string;
  label: string;
  status: "waiting" | "processing" | "completed" | "failed";
  startTime?: number;
  endTime?: number;
};

// Progress bar component for BRS improvement process
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

  // Update overall progress when steps or current step changes
  useEffect(() => {
    if (!isVisible) return;

    const completedSteps = steps.filter((s) => s.status === "completed").length;
    const inProgressStep = steps.find((s) => s.id === currentStepId);

    // Base progress on completed steps
    let progress = (completedSteps / steps.length) * 100;

    // Add partial progress for the current in-progress step
    if (inProgressStep && inProgressStep.status === "processing") {
      // Add partial credit for the in-progress step
      progress += (1 / steps.length) * 50;
    }

    setOverallProgress(Math.min(progress, 99)); // Cap at 99% until fully complete
  }, [steps, currentStepId, isVisible]);

  // When all steps are completed, jump to 100%
  useEffect(() => {
    if (steps.every((s) => s.status === "completed")) {
      setOverallProgress(100);
    }
  }, [steps]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-[600px] bg-black/75 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-blue-400/50 z-50 text-white">
      <h3 className="text-xl font-semibold mb-2 text-blue-300">
        Improving BRS Document
      </h3>

      {/* Overall progress bar */}
      <div className="mb-4">
        <div className="h-3 w-full bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-300 transition-all duration-500 ease-in-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="text-xs text-gray-300 text-right mt-1">
          {Math.round(overallProgress)}% complete
        </div>
      </div>

      {/* Step indicators */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                step.status === "completed"
                  ? "bg-green-500"
                  : step.status === "processing"
                  ? "bg-blue-500 animate-pulse"
                  : step.status === "failed"
                  ? "bg-red-500"
                  : "bg-gray-600"
              }`}
            >
              {step.status === "completed" && (
                <svg
                  className="w-3 h-3 text-white"
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
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
              {step.status === "failed" && (
                <svg
                  className="w-3 h-3 text-white"
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
                className={`text-sm ${
                  step.status === "completed"
                    ? "text-green-300"
                    : step.status === "processing"
                    ? "text-blue-300"
                    : step.status === "failed"
                    ? "text-red-300"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {step.status === "completed" &&
                step.endTime &&
                step.startTime &&
                `${((step.endTime - step.startTime) / 1000).toFixed(1)}s`}
              {step.status === "processing" &&
                step.startTime &&
                `${((Date.now() - step.startTime) / 1000).toFixed(1)}s...`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook to use the progress tracker
export function useBRSProgress() {
  // Define the standard BRS improvement steps
  const defaultSteps: ProgressStep[] = [
    { id: "upload", label: "Upload document", status: "waiting" },
    { id: "convert", label: "Convert to Markdown", status: "waiting" },
    { id: "analyze", label: "Analyze document structure", status: "waiting" },
    {
      id: "overview",
      label: "Generate implementation overview",
      status: "waiting",
    },
    {
      id: "filename",
      label: "Generate document identifier",
      status: "waiting",
    },
    { id: "improve", label: "Improve BRS content", status: "waiting" },
    { id: "save", label: "Save completed document", status: "waiting" },
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

  // Complete a step
  const completeStep = useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, status: "completed", endTime: Date.now() }
          : step
      )
    );
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