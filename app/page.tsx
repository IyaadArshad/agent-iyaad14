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
    { id: string; text: string; sender: "user" | "ai" }[]
  >([]);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const sendMessage = (msg: string) => {
    if (!msg.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: msg, sender: "user" },
    ]);
    setShowChat(true);
    setInputValue("");
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
                    className={`absolute right-3 text-gray-400 hover:text-[#1A479D] transition-all duration-200 ${
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
            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto px-6 sm:px-10 py-4"
              style={{ minHeight: 0 }}
            >
              <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    } w-full`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm max-w-[75%] break-words ${
                        msg.sender === "user"
                          ? "bg-[#EBF2FF] text-[#1A479D] rounded-br-md mr-2"
                          : "bg-gray-100 text-gray-900 rounded-bl-md ml-2"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            {/* Fixed input at bottom */}
            <div className="w-full px-6 sm:px-10 py-4 bg-white border-t border-gray-100">
              <div className="relative max-w-6xl mx-auto w-full hover:w-[102%] focus-within:w-[102%] transition-all duration-350">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type something great here..."
                  className={`w-full p-4 border border-gray-300 focus:outline-none hover:ring-0 focus:ring-[#1A479D] focus:border-[#1A479D] hover:border-[#1A479D] transition-all duration-200 resize-none overflow-hidden min-h-[65px] max-h-[200px] shadow-none ${
                    isMultiline ? "rounded-2xl" : "rounded-full"
                  }`}
                  rows={1}
                  style={{
                    paddingRight: "3.5rem",
                    lineHeight: "1.5",
                  }}
                />
                <button
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#1A479D] transition-all duration-200"
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
            {/* Adjust spacer height */}
            <div className="h-[20px]" />
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