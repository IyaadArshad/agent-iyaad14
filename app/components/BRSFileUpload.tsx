import { useState, useRef, useEffect } from "react";
import { ProgressStep } from "./BRSProgress";

interface BRSFileUploadProps {
  onFileSelect: (files: FileList) => void;
  isLoading: boolean;
  errorMessage: string | null;
  steps: ProgressStep[];
  currentStepId: string | null;
  uploadFileName?: string | null;
}

export default function BRSFileUpload({
  onFileSelect,
  isLoading,
  errorMessage,
  steps,
  currentStepId,
  uploadFileName,
}: BRSFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProgressUI, setShowProgressUI] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setShowProgressUI(false);
      timer = setTimeout(() => setShowProgressUI(true), 3000);
    } else {
      setShowProgressUI(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Add animation styles
  useEffect(() => {
    // Add animation class if not already in globals.css
    if (!document.querySelector('#brs-file-upload-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'brs-file-upload-styles';
      styleEl.innerHTML = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
        .animate-fadeOut {
          animation: fadeOut 0.5s ease-in-out;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
    }
  };

  // Define required task order and labels exactly as specified in user requirements
  // These labels will appear in the progress UI inside the file upload box
  const taskMap: Record<string, string> = {
    upload: "Upload file", 
    convert: "Parse PDF to Markdown",
    filename: "Generate file name",
    save: "Create file",
    overview: "Plan overview",
    improve: "Generate content",
    "final-save": "Save to file",
  };
  
  // Simple direct mapping for our exact step names - any other step IDs will be ignored in UI
  const mapStepId = (id: string): string => {
    const directMap: Record<string, string> = {
      'improve': 'improve',
      'save': 'save',
      'filename': 'filename',
      'convert': 'convert',
      'upload': 'upload',
      'overview': 'overview',
      'analyze': 'upload',     // Map analyze to upload step as it's part of the same process
      'final-save': 'final-save'
    };
    return directMap[id] || id;
  };
  
  // Get current task (single task that's currently processing)
  const currentLabel = currentStepId ? taskMap[mapStepId(currentStepId)] : undefined;
  
  // PDF step is conditional - only show if we have a convert step in progress/completed
  const isPdfFile = steps.some(s => s.id === 'convert' && s.status !== 'waiting');
  
  // Create ordered task sequence based on file type (PDF or non-PDF)
  const orderedSteps = ['upload'];
  if (isPdfFile) orderedSteps.push('convert');
  orderedSteps.push('filename', 'save', 'overview', 'improve', 'final-save');
  
  // Calculate progress
  const completedStepIds = steps
    .filter(s => s.status === 'completed')
    .map(s => mapStepId(s.id));
  
  // Count how many of our ordered steps are complete  
  const completedCount = orderedSteps.filter(id => completedStepIds.includes(id)).length;
  const totalSteps = orderedSteps.length;
  
  console.log('BRS Steps:', { 
    steps: steps.map(s => `${s.id}: ${s.status}`), 
    currentStepId, 
    orderedSteps, 
    completedStepIds, 
    completedCount, 
    totalSteps 
  });
  
  // If we have a current step that's not yet completed, add partial progress
  const progressPercent = totalSteps 
    ? ((completedCount + (currentStepId && !completedStepIds.includes(mapStepId(currentStepId)) ? 0.5 : 0)) / totalSteps) * 100
    : 0;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div
        className={`flex flex-col transition-all items-center justify-center w-full h-128 border-2 rounded-lg cursor-pointer 
          ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400 hover:bg-blue-100/30"
          } 
          ${isLoading ? "pointer-events-none h-full" : "border-dashed"} 
          transition-all duration-200`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center p-5 text-center w-full">
          {isLoading ? (
            !showProgressUI ? (
              <div className="flex flex-col items-center space-y-3">
                <svg
                  className="w-10 h-10 text-blue-500 animate-spin"
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
                <p className="text-sm text-gray-500">Processing document...</p>
              </div>
            ) : (                <div className="w-full px-6 py-4">
                  <div className="text-lg font-bold text-[#1A479D] mb-3">
                    {currentStepId === "filename" && uploadFileName
                      ? `Creating BRS for ${uploadFileName}...`
                      : "Creating BRS..."}
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-[#1A479D] transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {currentLabel && (
                    <div className="text-sm text-gray-600 text-left animate-fadeIn transition-opacity">
                      {currentLabel}
                    </div>
                  )}
                </div>
            )
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div className="flex flex-col items-center">
                <p className="mb-2 text-sm text-gray-700">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, MD, or TXT (MAX. 10MB)
                </p>
              </div>
              <div className="flex mt-4 gap-2">
                <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  PDF
                </div>
                <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H7a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  MD
                </div>
                <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H7a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  TXT
                </div>
              </div>
            </>
          )}
        </div>

        {errorMessage && (
          <div className="text-red-500 text-sm mt-2 max-w-md text-center px-4">
            {errorMessage}
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.md,.txt,application/pdf,text/markdown,text/plain"
        onChange={handleFileSelect}
        disabled={isLoading}
      />

      <div className="mt-8 text-sm text-gray-500 text-center">
        <p>
          The document will be available in your library once processing is
          complete.
        </p>
        <p className="mt-1">
          Please do not leave the page as the document is being processed.
        </p>
      </div>
    </div>
  );
}