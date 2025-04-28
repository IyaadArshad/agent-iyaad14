"use client";
import Image from "next/image";
import { Sidebar } from "@/components/Sidebar";
import { useState, useRef, useEffect } from "react";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchIcon, BrainCircuitIcon, ZapIcon } from "lucide-react";

export default function Home() {
  const conversationHistory = [
    { id: "1", title: "Conversation 1", date: new Date() },
    { id: "2", title: "Conversation 2", date: new Date() },
  ];

  const [inputValue, setInputValue] = useState("");
  const [isMultiline, setIsMultiline] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState<
    { id: string; text: string; sender: "user" | "agent" }[]
  >([]);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [welcomeOpacity, setWelcomeOpacity] = useState(1);
  const [chatOpacity, setChatOpacity] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [modes, setModes] = useState({
    search: false,
    reason: false,
    jdi: false,
  });

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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const agentResponses = [
    "I'm analyzing your request for a BRS document. Could you provide more details about the project scope?",
    "Based on your input, I'll start drafting a Business Requirements Specification. Would you like me to include specific sections like scope, assumptions, and constraints?",
    "I've noted your requirements. A well-structured BRS should include functional requirements, system interfaces, and user characteristics. Would you like me to start with these sections?",
    "To create a comprehensive BRS, I'll need information about project timelines, stakeholders, and success criteria. Can you share these details?",
    "I can help formulate your business requirements. Let me know if you need specific industry compliance considerations included in the document.",
  ];

  const sendMessage = (msg: string) => {
    if (!msg.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: msg, sender: "user" },
    ]);

    setWelcomeOpacity(0);

    setTimeout(() => {
      setShowChat(true);
      setChatOpacity(1);
    }, 250);

    setInputValue("");

    setIsTyping(true);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * agentResponses.length);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: agentResponses[randomIndex],
          sender: "agent",
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      setInputValue((prev) => prev + "\n");
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        sendMessage(inputValue);
      }
    } else if (e.key === "Backspace" && inputValue.endsWith("\n")) {
      setInputValue((prev) => prev.slice(0, -1));
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const fileNames = files.map((file) => file.name).join(", ");
      setInputValue(
        (prev) => prev + (prev ? " " : "") + `Uploaded: ${fileNames}`
      );
    }
  };

  const toggleMode = (mode: "search" | "reason" | "jdi") => {
    setModes((prev) => ({
      ...prev,
      [mode]: !prev[mode],
    }));
  };

  const isAnyModeActive = () => {
    return modes.search || modes.reason || modes.jdi;
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        isCollapsed={false}
        toggleSidebar={() => {}}
        conversationHistory={conversationHistory}
        onNewChat={() => {}}
        onSelectConversation={(id) => console.log("Selected:", id)}
      />
      <div className="flex-1 flex flex-col relative">
        {!showChat ? (
          <main
            className="flex-1 flex flex-col items-center justify-center"
            style={{
              opacity: welcomeOpacity,
              transition: "opacity 0.3s ease-out",
            }}
          >
            <div className="w-full max-w-2xl flex flex-col items-center px-4">
              <div className="mb-3 w-32 h-32 relative">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/finac-logo-removebg-aLpR2MPh5KBTtDt9S0tD9MKhOeyle0.png"
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
              <div className="w-5/5 hover:w-5/4 focus-within:w-5/4 transition-all duration-200 mb-8">
                <div className="relative">
                  <div
                    className={`relative ${
                      isDragging ? "bg-blue-50 border-dashed" : ""
                    } border border-gray-300 rounded-full hover:border-[#1A479D] focus-within:border-[#1A479D] focus-within:ring-[#1A479D] transition-all duration-200`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isDragging
                          ? "Drop files here..."
                          : "Type something great here or drop files..."
                      }
                      className="w-full p-4 border-0 focus:outline-none resize-none overflow-hidden min-h-[56px] max-h-[200px] rounded-2xl"
                      rows={1}
                      style={{
                        paddingRight: "3rem",
                        lineHeight: "1.5",
                      }}
                    />
                    <button
                      className={`absolute right-3 hover:cursor-pointer text-gray-400 hover:text-[#1A479D] transition-all duration-200 ${
                        isMultiline
                          ? "top-4"
                          : "top-1/2 transform -translate-y-1/2"
                      }`}
                      onClick={() => {
                        if (inputValue.trim()) {
                          sendMessage(inputValue);
                        }
                      }}
                    >
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
                    </button>

                    {isDragging && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-70 rounded-2xl border-2 border-blue-300 border-dashed">
                        <div className="text-blue-500 font-medium">
                          Drop files here
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
              <div className="absolute inset-0 overflow-y-auto pb-24">
                <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
                  <div className="sticky top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent z-10"></div>
                  <div className="flex flex-col gap-6">
                    {messages.map((msg, index) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender === "user"
                            ? "justify-end"
                            : "justify-start"
                        } w-full ${index === 0 ? "-mt-4" : ""}`}
                      >
                        <div
                          className={`${
                            msg.sender === "user"
                              ? "px-4 py-3 bg-[#EBF2FF] text-[#1A479D] rounded-2xl rounded-br-md mr-1 shadow-sm max-w-[80%]"
                              : "px-3 py-2 text-gray-900 rounded-lg max-w-[85%]"
                          } break-words`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start w-full">
                        <div className="px-3 py-2 bg-gray-50 rounded-lg">
                          <div className="flex space-x-1">
                            <div
                              className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            ></div>
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
                    <div className="relative">
                      <div
                        className={`relative ${
                          isDragging ? "bg-blue-50 border-dashed" : ""
                        } border border-gray-300 rounded-2xl hover:border-[#1A479D] focus-within:border-[#1A479D] focus-within:ring-[#1A479D] transition-all duration-200`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <textarea
                          ref={textareaRef}
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={
                            isDragging
                              ? "Drop files here..."
                              : "Type something great here or drop files..."
                          }
                          className="w-full p-4 border-0 focus:outline-none resize-none overflow-hidden min-h-[56px] max-h-[200px] rounded-t-2xl"
                          rows={1}
                          style={{
                            paddingRight: "3rem",
                            lineHeight: "1.5",
                          }}
                        />
                        <button
                          className={`absolute right-3 hover:cursor-pointer text-gray-400 hover:text-[#1A479D] transition-all duration-200 ${
                            isMultiline
                              ? "top-4"
                              : "top-[28px] transform -translate-y-1/2"
                          }`}
                          onClick={() => {
                            if (inputValue.trim()) {
                              sendMessage(inputValue);
                            }
                          }}
                        >
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
                        </button>

                        <div className="h-px bg-gray-200 w-full"></div>

                        <div className="flex items-center px-4 py-2 bg-gray-50 rounded-b-2xl justify-between">
                          <button className="flex items-center gap-1.5 p-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-100 hover:cursor-pointer transition-all text-gray-600">
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
                            Attach files
                          </button>

                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className={`p-1.5 rounded-md hover:cursor-pointer transition-all flex items-center gap-1 ${
                                      modes.search
                                        ? "bg-[#EBF2FF] text-[#1A479D] border border-[#1A479D]/20"
                                        : "text-gray-600 hover:bg-gray-200"
                                    }`}
                                    onClick={() => toggleMode("search")}
                                  >
                                    <SearchIcon className="h-3.5 w-3.5" />
                                    <span className="text-xs">Search</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-gray-800 text-white text-xs p-2 rounded shadow-md"
                                >
                                  <p>Enables web search capabilities</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className={`p-1.5 rounded-md hover:cursor-pointer transition-all flex items-center gap-1 ${
                                      modes.reason
                                        ? "bg-[#EBF2FF] text-[#1A479D] border border-[#1A479D]/20"
                                        : "text-gray-600 hover:bg-gray-200"
                                    }`}
                                    onClick={() => toggleMode("reason")}
                                  >
                                    <BrainCircuitIcon className="h-3.5 w-3.5" />
                                    <span className="text-xs">Reason</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-gray-800 text-white text-xs p-2 rounded shadow-md"
                                >
                                  <p>Enhances complex reasoning capabilities</p>
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
                                    <ZapIcon className="h-3.5 w-3.5" />
                                    <span className="text-xs">JDI Mode</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-gray-800 text-white text-xs p-2 rounded shadow-md"
                                >
                                  <p>
                                    "Just Do It" - follows instructions without
                                    asking questions
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        {isDragging && (
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-70 rounded-2xl border-2 border-blue-300 border-dashed">
                            <div className="text-blue-500 font-medium">
                              Drop files here
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {!showChat && (
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
      </div>
    </div>
  );
}