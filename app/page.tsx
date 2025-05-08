"use client";
import Image from "next/image";
import { Sidebar } from "@/components/Sidebar";
import { useState, useRef, useEffect, memo } from "react";
import React from "react";
import "./markdown-styles.css";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SearchIcon,
  BrainCircuitIcon,
  ZapIcon,
  SquareIcon,
  RocketIcon,
  CopyIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  RefreshCwIcon,
  PencilIcon,
  BellIcon,
  SettingsIcon,
  PaperclipIcon,
  UploadIcon,
} from "lucide-react";
import { AnimatedMarkdown } from "@/components/AnimatedMarkdown";
import MessageActionButtons from "@/components/MessageActionButtons";
import { getRecentDocuments, RecentDocument } from "@/lib/utils";
import { AuthModals } from "@/components/Auth/AuthModals";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/modal";

type MessageType = {
  id: string;
  text: string;
  sender: "user" | "agent" | "function";
  functionName?: string;
  functionParams?: any;
  functionResult?: any;
  calculatedShowAfterMs?: number;
};

type Conversation = {
  id: string;
  title: string;
  date: Date;
  messages: MessageType[];
};

interface MessageItemProps {
  msg: MessageType;
  index: number;
  isWaitingForResponse: boolean;
  isLastMessage: boolean;
}

const MessageItem = memo(
  ({ msg, index, isWaitingForResponse, isLastMessage }: MessageItemProps) => {
    if (msg.sender === "user") {
      return (
        <div
          key={msg.id}
          className={`flex justify-end w-full ${index === 0 ? "-mt-4" : ""}`}
        >
          <div className="px-4 py-3 bg-[#EBF2FF] text-[#1A479D] rounded-2xl rounded-br-md mr-1 shadow-sm max-w-[80%] break-words">
            {msg.text}
          </div>
        </div>
      );
    } else if (msg.sender === "agent") {
      return (
        <div
          key={msg.id}
          className={`agent-message-container flex flex-col items-start w-full ${
            index === 0 ? "-mt-4" : ""
          }`}
        >
          <div className="px-3 py-2 text-gray-900 rounded-lg max-w-[85%] break-words">
            <div className="message-content-wrapper">
              <AnimatedMarkdown
                content={msg.text}
                messageId={msg.id}
                key={`markdown-${msg.id}`}
                onAnimationComplete={(duration) => {}}
              />
              <MessageActionButtons
                messageId={msg.id}
                content={msg.text}
                showAfterMs={msg.calculatedShowAfterMs ?? 1500}
                isComplete={!isWaitingForResponse || !isLastMessage}
              />
            </div>
          </div>
        </div>
      );
    } else if (msg.sender === "function") {
      return (
        <div
          key={msg.id}
          className="flex justify-start w-full items-center my-2"
        >
          <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md max-w-[90%] text-sm border border-gray-200">
            <div className="font-medium text-xs text-gray-600 mb-0.5">
              Function call:{" "}
              <span className="text-blue-600">{msg.functionName}</span>
            </div>
            {msg.functionResult && (
              <div className="text-xs mt-2 text-green-600">
                {msg.functionResult.success ? "✓ Success" : "✗ Failed"}:{" "}
                {msg.functionResult.message ||
                  (msg.functionResult.success
                    ? "Operation completed"
                    : "Operation failed")}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  }
);

MessageItem.displayName = "MessageItem";

interface InputBoxProps {
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  onSendMessage: (msg: string) => void;
  onStopResponse?: () => void;
  placeholder?: string;
  showBottomSection?: boolean;
  modes?: {
    search: boolean;
    reason: boolean;
    jdi: boolean;
    lite: boolean;
  };
  toggleMode?: (mode: "search" | "reason" | "jdi" | "lite") => void;
  className?: string;
  isWaitingForResponse?: boolean;
  uploadFiles?: (files: FileList) => Promise<void>;
}

function InputBox({
  inputValue,
  setInputValue,
  onSendMessage,
  onStopResponse = () => {},
  placeholder = "Type something great here or drop files...",
  showBottomSection = false,
  modes = { search: false, reason: false, jdi: false, lite: false },
  toggleMode = () => {},
  className = "",
  isWaitingForResponse = false,
  uploadFiles = async () => {},
}: InputBoxProps) {
  const [isMultiline, setIsMultiline] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [iconState, setIconState] = useState<
    "idle" | "loading" | "success" | "error" | "fadeLoading"
  >("idle");

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + "px";
      const newlineCount = (inputValue.match(/\n/g) || []).length;
      setIsMultiline(newlineCount > 0 || scrollHeight > 65);
      if (inputValue === "") {
        textarea.style.height = "56px";
        setIsMultiline(false);
      }
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      setInputValue((prev: string) => prev + "\n");
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSendMessage(inputValue);
      }
    } else if (e.key === "Backspace" && inputValue.endsWith("\n")) {
      setInputValue((prev: string) => prev.slice(0, -1));
      e.preventDefault();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIconState("loading");
      try {
        await uploadFiles(e.dataTransfer.files);
        setIconState("success");
        const fileNames = Array.from(e.dataTransfer.files)
          .map((file) => file.name)
          .join(", ");
        setInputValue(
          (prev: string) =>
            prev +
            (prev ? " " : "") +
            `Uploaded files: ${fileNames}. Please analyze these files for me.`
        );
        await new Promise((res) => setTimeout(res, 900));
        setIconState("idle");
      } catch (error) {
        console.error("Error uploading dropped files:", error);
        setIconState("error");
        await new Promise((res) => setTimeout(res, 900));
        setIconState("idle");
      }
    } else {
      setIconState("error");
      await new Promise((res) => setTimeout(res, 900));
      setIconState("idle");
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative ${
          isDragging ? "bg-blue-50 border-dashed" : ""
        } border border-gray-300 ${
          showBottomSection ? "rounded-2xl" : "rounded-full"
        } hover:border-[#1A479D] focus-within:border-[#1A479D] focus-within:ring-[#1A479D] transition-all duration-200 ${""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDragging ? "Drop files here..." : placeholder}
          className={`w-full p-4 border-0 focus:outline-none resize-none overflow-hidden min-h-[56px] max-h-[200px] ${
            showBottomSection ? "rounded-t-2xl" : "rounded-full"
          }`}
          rows={1}
          style={{
            paddingRight: "3rem",
            lineHeight: "1.5",
          }}
        />
        <button
          className={`absolute right-3 hover:cursor-pointer text-gray-400 hover:text-[#1A479D] transition-all duration-200 ${
            isMultiline ? "top-4" : "top-[28px] transform -translate-y-1/2"
          }`}
          onClick={() => {
            if (isWaitingForResponse) {
              onStopResponse();
            } else if (inputValue.trim()) {
              onSendMessage(inputValue);
            }
          }}
        >
          {isWaitingForResponse ? (
            <SquareIcon className="w-5 h-5" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-send"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          )}
        </button>

        {showBottomSection && (
          <>
            <div className="h-px bg-gray-200 w-full"></div>

            <div className="flex items-center px-4 py-2 bg-gray-50 rounded-b-2xl justify-between">
              <button
                type="button"
                className={`flex items-center gap-1.5 p-1.5 text-xs rounded-md border border-gray-200 ${
                  modes.lite
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-100 hover:cursor-pointer"
                } transition-all text-gray-600 relative`}
                onClick={async () => {
                  if (modes.lite) return;

                  setIconState("loading");

                  const resetTimer = setTimeout(() => {
                    setIconState("idle");
                  }, 5000);

                  const fileInput = document.getElementById(
                    "chat-file-input"
                  ) as HTMLInputElement | null;
                  if (fileInput) {
                    fileInput.click();

                    const handleFocus = () => {
                      clearTimeout(resetTimer);
                      setTimeout(() => {
                        if (!fileInput.files || fileInput.files.length === 0) {
                          setIconState("idle");
                        }
                      }, 100);
                    };

                    window.addEventListener("focus", handleFocus, {
                      once: true,
                    });
                  }
                }}
              >
                <span
                  className={`transition-opacity duration-200 absolute left-2 ${
                    iconState === "idle"
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-paperclip"
                  >
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </span>
                <span
                  className={`transition-opacity duration-200 absolute left-2 ${
                    iconState === "loading"
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="currentColor"
                      fillOpacity="0.1"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M12 2a10 10 0 0110 10h-4a6 6 0 00-6-6V2z"
                    />
                  </svg>
                </span>
                <span
                  className={`transition-opacity duration-200 absolute left-2 ${
                    iconState === "success"
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span
                  className={`transition-opacity duration-200 absolute left-2 ${
                    iconState === "error"
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
                <span className="pl-5">Attach files</span>
                <input
                  id="chat-file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    if (modes.lite) return;

                    const files = e.target.files;
                    if (!files || files.length === 0) {
                      setIconState("idle");
                      return;
                    }

                    try {
                      setIconState("fadeLoading");
                      await new Promise((res) => setTimeout(res, 200));

                      await uploadFiles(files);

                      setIconState("success");
                      const fileNames = Array.from(files)
                        .map((file) => file.name)
                        .join(", ");
                      setInputValue(
                        (prev: string) =>
                          prev +
                          (prev ? " " : "") +
                          `Uploaded files: ${fileNames}. Please analyze these files for me.`
                      );
                    } catch (error) {
                      console.error("Error uploading files:", error);
                      setIconState("error");
                    }

                    await new Promise((res) => setTimeout(res, 900));
                    setIconState("idle");
                  }}
                />
              </button>

              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={`p-1.5 rounded-md hover:cursor-pointer transition-all flex items-center gap-1 ${
                          modes.lite
                            ? "bg-[#EBF2FF] text-[#1A479D] border border-[#1A479D]/20"
                            : "text-gray-600 hover:bg-gray-200"
                        }`}
                        onClick={() => toggleMode("lite")}
                      >
                        <ZapIcon height={14} width={14} />
                        <span className="text-xs">Lite</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-gray-800 text-white text-xs p-2 rounded shadow-md"
                    >
                      <p>
                        Lightweight mode - text only, no file operations or
                        advanced features
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={`p-1.5 rounded-md ${
                          modes.lite || modes.reason
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:cursor-pointer hover:bg-gray-200"
                        } transition-all flex items-center gap-1 ${
                          modes.search && !modes.lite && !modes.reason
                            ? "bg-[#EBF2FF] text-[#1A479D] border border-[#1A479D]/20"
                            : "text-gray-600"
                        }`}
                        onClick={() =>
                          !modes.lite && !modes.reason && toggleMode("search")
                        }
                      >
                        <SearchIcon className="h-3.5 w-3.5" />
                        <span className="text-xs">Search</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-gray-800 text-white text-xs p-2 rounded shadow-md"
                    >
                      <p>
                        {modes.lite
                          ? "Search is disabled in lite mode"
                          : modes.reason
                          ? "Search is disabled when reason mode is active"
                          : "Enables web search capabilities"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={`p-1.5 rounded-md ${
                          modes.lite
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:cursor-pointer hover:bg-gray-200"
                        } transition-all flex items-center gap-1 ${
                          modes.reason && !modes.lite
                            ? "bg-[#EBF2FF] text-[#1A479D] border border-[#1A479D]/20"
                            : "text-gray-600"
                        }`}
                        onClick={() => !modes.lite && toggleMode("reason")}
                      >
                        <BrainCircuitIcon className="h-3.5 w-3.5" />
                        <span className="text-xs">Reason</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-gray-800 text-white text-xs p-2 rounded shadow-md"
                    >
                      <p>
                        {modes.lite
                          ? "Reasoning is disabled in lite mode"
                          : "Turns on the ability to reason"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={`p-1.5 rounded-md hover:cursor-pointer transition-all flex items-center gap-1 ${
                          modes.jdi
                            ? "bg-[#EBF2FF] text-[#1A479D] border border-[#1A479D]/20"
                            : "text-gray-600 hover:bg-gray-200"
                        }`}
                        onClick={() => toggleMode("jdi")}
                      >
                        <RocketIcon className="h-3.5 w-3.5" />
                        <span className="text-xs">JDI Mode</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-gray-800 text-white text-xs p-2 rounded shadow-md"
                    >
                      <p>
                        &quot;Just Do It&quot; - follows instructions without
                        asking questions
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </>
        )}

        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-70 rounded-2xl border-2 border-blue-300 border-dashed">
            <div className="text-blue-500 font-medium">Drop files here</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    Conversation[]
  >([]);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [welcomeOpacity, setWelcomeOpacity] = useState(1);
  const [chatOpacity, setChatOpacity] = useState(0);
  const [modes, setModes] = useState({
    search: false,
    reason: false,
    jdi: false,
    lite: false,
  });
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const currentResponseController = useRef<AbortController | null>(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const router = useRouter();

  const [useLiteOnFirst, setUseLiteOnFirst] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; text: string }[]
  >([]);
  useEffect(() => {
    const stored = localStorage.getItem("useLiteOnFirst");
    if (stored !== null) setUseLiteOnFirst(stored === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("useLiteOnFirst", useLiteOnFirst.toString());
  }, [useLiteOnFirst]);

  const [showImproveBRS, setShowImproveBRS] = useState(false);

  useEffect(() => {
    const storedHistory = localStorage.getItem("conversationHistory");
    if (storedHistory) {
      try {
        const parsedHistory: Conversation[] = JSON.parse(storedHistory).map(
          (conv: any) => ({
            ...conv,
            date: new Date(conv.date),
          })
        );
        setConversationHistory(parsedHistory);
      } catch (error) {
        console.error(
          "Failed to parse conversation history from localStorage:",
          error
        );
        setConversationHistory([]);
      }
    }

    const recentDocs = getRecentDocuments();
    setRecentDocuments(recentDocs);
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      const updatedHistory = conversationHistory.map((conv) =>
        conv.id === activeConversationId
          ? { ...conv, messages: messages }
          : conv
      );
      if (
        JSON.stringify(updatedHistory) !== JSON.stringify(conversationHistory)
      ) {
        setConversationHistory(updatedHistory);
        localStorage.setItem(
          "conversationHistory",
          JSON.stringify(updatedHistory)
        );
      } else {
        localStorage.setItem(
          "conversationHistory",
          JSON.stringify(updatedHistory)
        );
      }
    } else if (conversationHistory.length > 0) {
      localStorage.setItem(
        "conversationHistory",
        JSON.stringify(conversationHistory)
      );
    }
  }, [messages, activeConversationId, conversationHistory]);

  const calculateShowAfterMs = (text: string): number => {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const charCount = text.length;
    const lineCount = text.split("\n").length;

    let delay = Math.max(1500, wordCount * 18);

    if (text.includes("```")) delay += 500;
    if (text.includes("#")) delay += 300;
    if (text.includes("- ") || text.includes("* ")) delay += 400;
    if (text.includes("|") && text.includes("-|-")) delay += 600;

    if (charCount > 1000) delay += 500;
    if (lineCount > 10) delay += 400;

    return delay;
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }, 0);
    }
  }, [messages]);

  const uploadFiles = async (files: FileList): Promise<void> => {
    if (!files || files.length === 0) return;

    const uploadedIds: string[] = [];
    let uploadedFileNames: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/files/uploadToVectorStore", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to upload file: ${errorText}`);
        }

        const result = await response.json();
        if (result.success) {
          uploadedIds.push(result.fileId);
          uploadedFileNames.push(file.name);
        } else {
          throw new Error(result.message || "Error uploading file");
        }
      }

      setUploadedFileIds((prev) => [...prev, ...uploadedIds]);
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
  };

  const handleImproveBRSFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      await uploadFiles(files);
      const fileNames = Array.from(files)
        .map((file) => file.name)
        .join(", ");
      setInputValue(
        `I've uploaded ${fileNames}. Please improve this BRS document by making it more concise, fixing any inconsistencies, and adding necessary details where needed.`
      );
      setShowImproveBRS(false);
      setShowChat(true);
      setWelcomeOpacity(0);
      setChatOpacity(1);
      setTimeout(() => {
        const inputElement = document.querySelector(
          "textarea"
        ) as HTMLTextAreaElement | null;
        if (inputElement) inputElement.focus();
      }, 100);
    } catch (error) {
      console.error("Error uploading files in Improve BRS mode:", error);
    }
  };

  const stopResponse = async () => {
    if (!isWaitingForResponse || isStopping) return;

    setIsStopping(true);

    try {
      if (currentResponseController.current) {
        currentResponseController.current.abort();
      }

      await fetch("/api/agent/stop", {
        method: "POST",
      });

      setIsWaitingForResponse(false);
      setIsTyping(false);
      setShowSpinner(false);

      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          text: "*Response stopped by user*",
          sender: "agent",
        },
      ]);
    } catch (error) {
      console.error("Error stopping response:", error);
    } finally {
      setIsStopping(false);
    }
  };

  const sendMessage = async (msg: string) => {
    if (messages.length === 0 && useLiteOnFirst) {
      setModes((prev) => ({ ...prev, lite: true }));
    }
    if (!msg.trim() || isWaitingForResponse) return;

    const userMessageId = Date.now().toString();
    const userMessage: MessageType = {
      id: userMessageId,
      text: msg,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);

    if (messages.length === 0 && activeConversationId) {
      setConversationHistory((prevHistory) =>
        prevHistory.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                title:
                  msg.substring(0, 30) + (msg.length > 30 ? "..." : ""),
              }
            : conv
        )
      );
    }

    setWelcomeOpacity(0);
    setInputValue("");
    setIsWaitingForResponse(true);
    setIsTyping(true);
    setShowSpinner(true);

    setTimeout(() => {
      setShowChat(true);
      setChatOpacity(1);
    }, 250);

    const conversationMessages = messages
      .concat(userMessage)
      .map((msg) => {
        if (msg.sender === "user") {
          return { role: "user", content: msg.text };
        } else if (msg.sender === "agent") {
          return { role: "assistant", content: msg.text };
        } else {
          return null;
        }
      })
      .filter(Boolean);

    try {
      currentResponseController.current = new AbortController();
      const signal = currentResponseController.current.signal;

      const apiEndpoint = modes.lite
        ? "/api/agent/lite/responses"
        : "/api/agent/responses";

      const requestBody: any = {
        messages: conversationMessages,
        jdiMode: modes.jdi,
      };

      if (!modes.lite) {
        requestBody.reason = modes.reason;
        requestBody.search = modes.search;
        requestBody.uploadedFileIds =
          uploadedFileIds.length > 0 ? uploadedFileIds : [];
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is null");
      }

      let responseText = "";
      let functionCalls: MessageType[] = [];
      let agentMessageId = "agent-" + Date.now().toString();
      let agentMessageAdded = false;

      const processEvents = async () => {
        let done = false;
        let buffer = "";

        while (!done) {
          const { value, done: isDone } = await reader.read();
          done = isDone;

          if (done) break;

          const text = new TextDecoder().decode(value);
          buffer += text;

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const eventString = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 2);

            if (eventString.startsWith("data: ")) {
              const eventData = eventString.substring(6);
              try {
                const data = JSON.parse(eventData);

                if (data.type === "message") {
                  let messageText = "";
                  if (typeof data.content === "string") {
                    messageText = data.content;
                  } else if (
                    typeof data.content === "object" &&
                    data.content !== null &&
                    "value" in data.content &&
                    typeof data.content.value === "string"
                  ) {
                    console.warn(
                      "Received message content as object, extracting value:",
                      data.content
                    );
                    messageText = data.content.value;
                  } else {
                    console.warn(
                      "Received unexpected message content type, attempting to stringify:",
                      data.content
                    );
                    try {
                      messageText = String(data.content);
                    } catch {
                      messageText = "[Unsupported message content]";
                    }
                  }

                  if (isTyping) {
                    setIsTyping(false);
                  }

                  responseText = messageText;
                  const calculatedDelay = calculateShowAfterMs(responseText);

                  if (!agentMessageAdded) {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: agentMessageId,
                        text: messageText,
                        sender: "agent",
                        calculatedShowAfterMs: calculatedDelay,
                      },
                    ]);
                    agentMessageAdded = true;
                  } else {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === agentMessageId
                          ? {
                              ...m,
                              text: messageText,
                              calculatedShowAfterMs: calculatedDelay,
                            }
                          : m
                      )
                    );
                  }
                } else if (data.type === "function" && !modes.lite) {
                  if (isTyping) {
                    setIsTyping(false);
                  }
                  const funcCall: MessageType = {
                    id: "func-" + Date.now().toString(),
                    text: `Calling function: ${data.data}`,
                    sender: "function",
                    functionName: data.data,
                    functionParams: data.parameters,
                  };
                  functionCalls.push(funcCall);
                  setMessages((prev) => [...prev, funcCall]);
                } else if (data.type === "functionResult" && !modes.lite) {
                  if (functionCalls.length > 0) {
                    const lastFuncCall =
                      functionCalls[functionCalls.length - 1];
                    lastFuncCall.functionResult = data.data;

                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === lastFuncCall.id
                          ? { ...m, functionResult: data.data }
                          : m
                      )
                    );
                  }
                } else if (data.type === "error") {
                  console.error("API Error:", data.message);
                  if (isTyping) {
                    setIsTyping(false);
                  }
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: "error-" + Date.now().toString(),
                      text: `Error: ${data.message}`,
                      sender: "agent",
                    },
                  ]);
                } else if (data.type === "end") {
                  setIsWaitingForResponse(false);
                  if (isTyping) {
                    setIsTyping(false);
                  }
                  setShowSpinner(false);

                  if (agentMessageAdded) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === agentMessageId ? { ...m } : m
                      )
                    );
                  }
                }
              } catch (error) {
                console.error("Error parsing event:", error, eventString);
                if (isTyping) {
                  setIsTyping(false);
                }
              }
            }
            boundary = buffer.indexOf("\n\n");
          }
        }
        setShowSpinner(false);
        if (agentMessageAdded) {
          setMessages((prev) =>
            prev.map((m) => (m.id === agentMessageId ? { ...m } : m))
          );
        }
      };

      processEvents().catch((error) => {
        if (error.name === "AbortError") {
          console.log("Request was aborted");
          return;
        }

        console.error("Error processing stream:", error);
        setIsTyping(false);
        setShowSpinner(false);
        setIsWaitingForResponse(false);
        setMessages((prev) => [
          ...prev,
          {
            id: "error-" + Date.now().toString(),
            text: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            sender: "agent",
          },
        ]);
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request was aborted");
        return;
      }

      console.error("Error calling API:", error);
      setIsTyping(false);
      setShowSpinner(false);
      setIsWaitingForResponse(false);
      setMessages((prev) => [
        ...prev,
        {
          id: "error-" + Date.now().toString(),
          text: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          sender: "agent",
        },
      ]);
    }
  };

  const toggleMode = (mode: "search" | "reason" | "jdi" | "lite") => {
    setModes((prev) => {
      const newState = { ...prev };

      if (mode === "lite") {
        newState.lite = !prev.lite;
        if (newState.lite) {
          newState.search = false;
          newState.reason = false;
        }
      } else if (mode === "reason") {
        if (!prev.lite) {
          newState.reason = !prev.reason;
          if (newState.reason) {
            newState.search = false;
          }
        }
      } else if (mode === "search") {
        if (!prev.lite && !prev.reason) {
          newState.search = !prev.search;
        }
      } else if (mode === "jdi") {
        newState.jdi = !prev.jdi;
      }

      return newState;
    });
  };

  const handleNewChat = () => {
    const newConversationId = `conv-${Date.now()}`;
    const newConversation: Conversation = {
      id: newConversationId,
      title: "New Chat",
      date: new Date(),
      messages: [],
    };
    setConversationHistory((prev) => [...prev, newConversation]);
    setActiveConversationId(newConversationId);
    setMessages([]);
    setShowChat(false);
    setWelcomeOpacity(1);
    setChatOpacity(0);
    setInputValue("");
  };

  const handleSelectConversation = (id: string) => {
    const selectedConv = conversationHistory.find((conv) => conv.id === id);
    if (selectedConv) {
      setActiveConversationId(id);
      setMessages(selectedConv.messages);
      setShowChat(true);
      setWelcomeOpacity(0);
      setChatOpacity(1);
    }
  };

  const navigateToLibrary = () => {
    router.push("/library");
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
    setShowSignupModal(false);
  };

  const handleSignupClick = () => {
    setShowSignupModal(true);
    setShowLoginModal(false);
  };

  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignupModal(false);
    setShowLoginModal(true);
  };

  return (
    <div className={`flex min-h-screen h-screen bg-white`}>
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={() => setIsCollapsed((prev) => !prev)}
        conversationHistory={conversationHistory}
        recentDocuments={recentDocuments}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        activeConversationId={activeConversationId}
        onOpenLibrary={navigateToLibrary}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
      />
      <div className="flex-1 flex flex-col relative">
        {showImproveBRS ? (
          <div className="flex-1 flex flex-col p-8">
            <h1 className="text-3xl font-bold text-[#1A479D] mb-2">Improve BRS</h1>
            <p className="text-gray-500 mb-8">
              Upload your existing BRS document to enhance it. Our AI will help make it more concise,
              add missing details, fix inconsistencies, and improve clarity throughout the document.
            </p>
            
            <div 
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-[#1A479D] transition-colors cursor-pointer"
              onClick={() => {
                const fileInput = document.getElementById("improve-brs-file-input") as HTMLInputElement | null;
                if (fileInput) fileInput.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("border-[#1A479D]", "bg-blue-50");
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-[#1A479D]", "bg-blue-50");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-[#1A479D]", "bg-blue-50");
                handleImproveBRSFileUpload(e.dataTransfer.files);
              }}
            >
              <UploadIcon className="w-20 h-20 text-gray-400 mb-6" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Drag & Drop your BRS file here</h2>
              <p className="text-gray-500 mb-6">Or click to browse files</p>
              <button className="px-6 py-3 bg-[#1A479D] text-white rounded-lg hover:bg-[#15387d] transition-colors">
                Select File
              </button>
              <input 
                id="improve-brs-file-input" 
                type="file" 
                accept=".doc,.docx,.pdf,.txt,.md" 
                className="hidden"
                onChange={(e) => handleImproveBRSFileUpload(e.target.files)}
              />
            </div>
          </div>
        ) : !showChat ? (
          <main
            className="flex-1 flex flex-col items-center justify-center"
            style={{
              opacity: welcomeOpacity,
              transition: "opacity 0.3s ease-out",
            }}
          >
            <div className="w-full max-w-2xl flex flex-col items-center px-4 animate-element">
              <div className="mb-3 w-32 h-32 relative">
                <Image
                  src="/finac-logo.png"
                  alt="FiNAC Logo"
                  fill
                  style={{ objectFit: "contain" }}
                  priority
                />
              </div>
              <h1 className="text-4xl font-semibold mb-1 text-center">
                <span className="text-[#1A479D] font-bold">FiNAC BRS AI</span>{" "}
                Welcomes You
              </h1>
              <p className="text-gray-500 mb-6 text-md text-center">
                Type a message to start your BRS generation process
              </p>
              <div className="w-5/5 hover:w-5/4 focus-within:w-5/4 transition-all duration-300 mb-8">
                <InputBox
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  onSendMessage={sendMessage}
                  onStopResponse={stopResponse}
                  placeholder="Type something great here or drop files..."
                  showBottomSection={false}
                  isWaitingForResponse={isWaitingForResponse}
                  uploadFiles={uploadFiles}
                />
              </div>
            </div>
          </main>
        ) : (
          <div
            className="flex-1 flex flex-col h-full"
            style={{
              opacity: chatOpacity,
              transition: "opacity 0.3s ease-in",
            }}
          >
            <div className="flex-grow relative overflow-hidden flex flex-col">
              <div
                ref={scrollContainerRef}
                className="absolute inset-0 overflow-y-auto pb-40"
              >
                <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
                  <div className="sticky top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent z-10"></div>
                  <div className="flex flex-col gap-6 mb-8">
                    {messages.map((msg, index) => (
                      <MessageItem
                        key={msg.id}
                        msg={msg}
                        index={index}
                        isWaitingForResponse={isWaitingForResponse}
                        isLastMessage={index === messages.length - 1}
                      />
                    ))}
                    {showSpinner && (
                      <div className="flex justify-start w-full">
                        <div
                          className={`ml-2 mt-2 border-1 rounded-full ${
                            isTyping ? "animate-fade-in" : "animate-fade-out"
                          }`}
                          style={{
                            animationDelay: isTyping ? "75ms" : "0ms",
                            opacity: isTyping ? 0 : 1,
                            animationFillMode: "forwards",
                          }}
                        >
                          <div className="flex items-center">
                            <div className="typing-spinner">
                              <div className="spinner-circle"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 z-20">
                <div className="h-20 bg-gradient-to-t from-white to-transparent">
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-white"></div>
                </div>
                <div className="bg-white px-4 sm:px-6 mb-8 pt-1">
                  <div className="w-full max-w-6xl mx-auto">
                    <InputBox
                      inputValue={inputValue}
                      setInputValue={setInputValue}
                      onSendMessage={sendMessage}
                      onStopResponse={stopResponse}
                      placeholder="Type your next message here or drop files..."
                      showBottomSection={true}
                      modes={modes}
                      toggleMode={toggleMode}
                      isWaitingForResponse={isWaitingForResponse}
                      uploadFiles={uploadFiles}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {!showChat && !showImproveBRS && (
          <footer
            className="p-4 text-center text-gray-500 text-sm"
            style={{
              opacity: welcomeOpacity,
              transition: "opacity 0.3s ease-out",
            }}
          >
            <p className="text-sm text-gray-400 mt-2 text-center">
              Powered by FiNAC AI. <br />
              Icons by{" "}
              <a
                className="underline"
                href="https://icons8.com"
                target="_blank"
              >
                Icons8
              </a>
            </p>
          </footer>
        )}
        
        <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
                  onClick={() => setShowImproveBRS(prev => !prev)}
                >
                  <PaperclipIcon className="w-5 h-5 text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Improve BRS</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-gray-100 cursor-pointer">
                <BellIcon className="w-5 h-5 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {notifications.length > 0 ? (
                notifications.map((note) => (
                  <DropdownMenuItem
                    key={note.id}
                    className="text-sm cursor-pointer"
                  >
                    {note.text}
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No notifications
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-gray-100 cursor-pointer">
                <SettingsIcon className="w-5 h-5 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={8}
              className="bg-white rounded-md shadow-lg p-2 min-w-[160px] -translate-x-3"
            >
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={useLiteOnFirst}
                    onChange={() => setUseLiteOnFirst((prev) => !prev)}
                  />
                  <div className="w-11 h-6 ring-0 bg-gray-200 peer-focus:ring-0 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-none after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </div>
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Use lite mode on first chat message
                </span>
              </label>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <AuthModals
        showLoginModal={showLoginModal}
        showSignupModal={showSignupModal}
        onCloseLoginModal={() => setShowLoginModal(false)}
        onCloseSignupModal={() => setShowSignupModal(false)}
        onSwitchToSignup={handleSwitchToSignup}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
}