"use client";
import Image from "next/image";
import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  const conversationHistory = [
    { id: "1", title: "Conversation 1", date: new Date() },
    { id: "2", title: "Conversation 2", date: new Date() },
  ];

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
      <div className="flex-1 flex flex-col">
        {/* Top section with user avatar */}
        <div className="flex justify-end items-center w-full p-6">
          <div className="relative w-12 h-12 border-2 border-[#1A479D] rounded-full overflow-hidden flex items-center justify-center bg-white">
            <Image
              src="/icons/user-male-circle.png"
              alt="User Avatar"
              width={48}
              height={48}
              className="rounded-full"
            />
          </div>
        </div>

        {/* Main content - centered vertically */}
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
              Type a message to start your conversation
            </p>

            {/* Input box */}
            <div className="w-5/5 hover:w-5/4 focus-within:w-5/4 transition-all duration-350 mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type something great here..."
                  className="w-full p-4 border border-gray-300 rounded-full focus:outline-none hover:ring-0 focus:ring-[#1A479D] focus:border-[#1A479D] hover:border-[#1A479D] transition-colors"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#1A479D]">
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

        {/* Footer */}
        <footer className="p-4 text-center text-gray-500 text-sm">
          <p className="text-sm text-gray-400 mt-2 text-center">
            Powered by FiNAC AI. <br />
            Icons by{" "}
            <a className="underline" href="https://icons8.com" target="_blank">
              Icons8
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}