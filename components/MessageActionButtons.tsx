import React, { useState, useEffect, useRef } from "react";
import {
  CopyIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  RefreshCwIcon,
  PencilIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageActionButtonsProps {
  messageId?: string;
  content: string;
  showAfterMs: number;
  isComplete: boolean;
}

const MessageActionButtons: React.FC<MessageActionButtonsProps> = ({
  messageId,
  content,
  showAfterMs,
  isComplete,
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timer if any
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false); // Reset visibility on re-render/prop change

    // Set a timer to show buttons if the message is complete
    if (isComplete) {
      timerRef.current = setTimeout(() => {
        setVisible(true);
        timerRef.current = null;
      }, showAfterMs); // Use the provided delay directly

      console.debug(
        `MessageActionButtons: Scheduling visibility for ${messageId} after ${showAfterMs}ms`
      );
    } else {
      console.debug(
        `MessageActionButtons: Not scheduling visibility for ${messageId} as isComplete is false.`
      );
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showAfterMs, isComplete, messageId]);

  return (
    <div
      className={`
        flex items-center gap-1.5 mt-2 ml-1
        transition-opacity duration-500 ease-in-out
        ${
          visible
            ? "opacity-70 hover:opacity-100"
            : "opacity-0 pointer-events-none"
        }
      `}
      aria-hidden={!visible}
    >
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              onClick={() =>
                navigator.clipboard
                  .writeText(content)
                  .then(() => console.log("Copied:", messageId))
              }
              disabled={!visible}
              tabIndex={visible ? 0 : -1}
            >
              <CopyIcon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Copy
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600 disabled:opacity-50"
              onClick={() => console.log("Thumbs Up clicked for:", messageId)}
              disabled={!visible}
              tabIndex={visible ? 0 : -1}
            >
              <ThumbsUpIcon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Good response
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 disabled:opacity-50"
              onClick={() => console.log("Thumbs Down clicked for:", messageId)}
              disabled={!visible}
              tabIndex={visible ? 0 : -1}
            >
              <ThumbsDownIcon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Bad response
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              onClick={() => console.log("Regenerate clicked for:", messageId)}
              disabled={!visible}
              tabIndex={visible ? 0 : -1}
            >
              <RefreshCwIcon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Regenerate response
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 disabled:opacity-50"
              onClick={() => console.log("Edit clicked for:", messageId)}
              disabled={!visible}
              tabIndex={visible ? 0 : -1}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Edit
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default MessageActionButtons;