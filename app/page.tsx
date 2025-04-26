"use client";
import Image from "next/image";
import { Sidebar } from "@/components/Sidebar";
import { useState, useRef, useEffect } from "react";
import React from "react";

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

  // Improved height adjustment function
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset the height first
      textarea.style.height = "auto";

      // Get the new scroll height and set it
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + "px";

      // Count actual newlines in the content
      const newlineCount = (inputValue.match(/\n/g) || []).length;

      // Update multiline state based on actual content or scrollHeight
      setIsMultiline(newlineCount > 0 || scrollHeight > 65);

      // Handle the empty case explicitly
      if (inputValue === "") {
        textarea.style.height = "56px"; // Reset to minimum height
        setIsMultiline(false);
      }
    }
  };

  // Update height whenever input value changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Sample agent responses
  const agentResponses = [
    "I'm analyzing your request for a BRS document. Could you provide more details about the project scope?",
    "Based on your input, I'll start drafting a Business Requirements Specification. Would you like me to include specific sections like scope, assumptions, and constraints?",
    "I've noted your requirements. A well-structured BRS should include functional requirements, system interfaces, and user characteristics. Would you like me to start with these sections?",
    "To create a comprehensive BRS, I'll need information about project timelines, stakeholders, and success criteria. Can you share these details?",
    "I can help formulate your business requirements. Let me know if you need specific industry compliance considerations included in the document."
  ];

  const sendMessage = (msg: string) => {
    if (!msg.trim()) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: msg, sender: "user" },
    ]);

    setShowChat(true);
    setInputValue("");

    // Simulate agent typing
    setIsTyping(true);

    // Add agent response after a delay
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
      // Handle backspace at end of line properly
      setInputValue((prev) => prev.slice(0, -1));
      e.preventDefault();
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={false}
        toggleSidebar={() => {}}
        conversationHistory={conversationHistory}
        onNewChat={() => {}}
        onSelectConversation={(id) => console.log("Selected:", id)}
      />
      {/* Main content */}
      <div className="flex-1 flex flex-col relative">
        {/* Main content */}
        {!showChat ? (
          <main className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl flex flex-col items-center px-4">
              {/* Logo */}
              <div className="mb-3 w-32 h-32 relative">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/finac-logo-removebg-aLpR2MPh5KBTtDt9S0tD9MKhOeyle0.png"
                  alt="FiNAC Logo"
                  fill
                  style={{ objectFit: "contain" }}
                  priority
                />
              </div>

              {/* Welcome text */}
              <h1 className="text-4xl font-semibold mb-1 text-center">
                <span className="text-[#1A479D] font-bold">FiNAC BRS AI</span>{" "}
                Welcomes You
              </h1>

              <p className="text-gray-500 mb-6 text-md text-center">
                Type a message to start your BRS generation process
              </p>

              {/* Expandable input box */}
              <div className="w-5/5  hover:w-5/4 focus-within:w-5/4 transition-all duration-200 mb-8">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type something great here..."
                    className={`w-full p-4 border border-gray-300 focus:outline-none hover:ring-0 focus:ring-[#1A479D] focus:border-[#1A479D] hover:border-[#1A479D] transition-all duration-200 resize-none overflow-hidden min-h-[56px] max-h-[200px] ${
                      isMultiline ? "rounded-2xl" : "rounded-full"
                    }`}
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
                </div>
              </div>
            </div>
          </main>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            {/* Messages area - now with fixed height and scrollable */}
            <div className="flex-grow flex justify-center px-3 sm:px-6 py-4 overflow-hidden">
              <div 
                className="w-full max-w-6xl h-[calc(100vh-180px)] overflow-y-auto px-1 py-2 rounded-lg bg-white"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div className="flex flex-col gap-6 w-full mx-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      } w-full`}
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
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
            
            {/* Fixed input at bottom - remained unchanged */}
            <div className="w-full px-6 sm:px-10 py-4 bg-white">
              <div className="relative w-full max-w-6xl mx-auto">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type something great here..."
                  className={`w-full p-4 border border-gray-300 focus:outline-none hover:ring-0 focus:ring-[#1A479D] focus:border-[#1A479D] hover:border-[#1A479D] transition-all duration-200 resize-none overflow-hidden min-h-[56px] max-h-[200px] ${
                    isMultiline ? "rounded-2xl" : "rounded-full"
                  }`}
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
              </div>
            </div>
          </div>
        )}

        {/* Footer - only show in welcome screen */}
        {!showChat && (
          <footer className="p-4 text-center text-gray-500 text-sm">
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