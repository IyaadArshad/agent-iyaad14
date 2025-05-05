"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SearchIcon, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  title: string;
  fileName: string;
  lastModified: Date;
  preview: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 8; // 4x2 grid
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Load documents from the API
  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("https://database.acroford.com/files", {
          headers: {
            Accept: "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch documents");
        }
        
        const data = await response.json();
        
        // Transform the data into our Document interface
        const formattedDocuments = data.map((file: any) => {
          const fileData = file.data || {};
          const latestVersion = fileData.latestVersion || 0;
          const versionData = (fileData.versions && fileData.versions[latestVersion]) || {};
          
          // Extract title from the content or use file name as fallback
          let title = file.file_name.replace(/\.md$/, "");
          let preview = "";
          
          // Attempt to extract content for preview
          if (typeof versionData === 'string') {
            // If versionData is a string, extract first paragraph for preview
            const firstParagraph = versionData.split("\n\n")[0];
            preview = firstParagraph || "";
            
            // Try to extract a title from first heading if available
            const titleMatch = versionData.match(/^# (.+)/m);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1];
            }
          }
          
          return {
            id: file.id,
            title: title,
            fileName: file.file_name,
            lastModified: new Date(file.last_modified || Date.now()),
            preview: preview,
          };
        });
        
        setDocuments(formattedDocuments);
        setFilteredDocuments(formattedDocuments);
        setTotalPages(Math.ceil(formattedDocuments.length / itemsPerPage));
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load conversation history and recent documents from localStorage
    const loadUserData = () => {
      try {
        const storedHistory = localStorage.getItem("conversationHistory");
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);
          setConversationHistory(parsedHistory);
        }
        
        const storedRecents = localStorage.getItem("recentDocuments");
        if (storedRecents) {
          const parsedRecents = JSON.parse(storedRecents);
          setRecentDocuments(parsedRecents);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    
    fetchDocuments();
    loadUserData();
  }, []);

  // Filter documents based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
      setCurrentPage(1);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    } else {
      setFilteredDocuments(documents);
      setTotalPages(Math.ceil(documents.length / itemsPerPage));
    }
  }, [searchQuery, documents]);

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDocuments.slice(startIndex, endIndex);
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  // Handle new chat
  const handleNewChat = () => {
    router.push("/");
  };

  // Handle document click - add to recent documents and navigate to document viewer
  const handleDocumentClick = (doc: Document) => {
    // Add to recent documents in localStorage
    try {
      const recentDoc = {
        id: doc.id,
        name: doc.title,
        lastOpened: new Date(),
      };
      
      // Get existing recents
      const storedRecents = localStorage.getItem("recentDocuments");
      let recents = storedRecents ? JSON.parse(storedRecents) : [];
      
      // Remove if already exists
      recents = recents.filter((item: any) => item.id !== doc.id);
      
      // Add to beginning
      recents.unshift(recentDoc);
      
      // Keep only 10 most recent
      if (recents.length > 10) {
        recents = recents.slice(0, 10);
      }
      
      // Save back to localStorage
      localStorage.setItem("recentDocuments", JSON.stringify(recents));
      
      // Navigate to document viewer
      router.push(`/document/${doc.id}`);
    } catch (error) {
      console.error("Error updating recent documents:", error);
      router.push(`/document/${doc.id}`);
    }
  };

  // Handle pagination
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handle login/signup modals
  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  const handleSignupClick = () => {
    setShowSignupModal(true);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={() => setIsCollapsed(!isCollapsed)}
        conversationHistory={conversationHistory}
        recentDocuments={recentDocuments}
        onNewChat={handleNewChat}
        onSelectConversation={(id) => router.push("/")}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
      />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 py-4 px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Document Library</h1>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search documents..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A479D] focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 bg-gray-50">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1A479D]"></div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {filteredDocuments.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {getCurrentPageItems().map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handleDocumentClick(doc)}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                          {doc.preview ? (
                            <div className="p-4 h-full overflow-hidden text-sm text-gray-600">
                              {doc.preview}
                            </div>
                          ) : (
                            <div className="flex justify-center items-center h-full text-gray-400">
                              <Image
                                src="/file.svg"
                                alt="Document"
                                width={48}
                                height={48}
                              />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 mb-1 truncate">{doc.title}</h3>
                          <p className="text-xs text-gray-500">Last modified: {formatDate(doc.lastModified)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex justify-center items-center space-x-4 pt-4">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={cn(
                        "p-2 rounded-full",
                        currentPage === 1
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage >= totalPages}
                      className={cn(
                        "p-2 rounded-full",
                        currentPage >= totalPages
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <Image
                    src="/file.svg"
                    alt="No documents"
                    width={80}
                    height={80}
                    className="opacity-30 mb-4"
                  />
                  <h3 className="text-xl font-medium text-gray-500 mb-2">No documents found</h3>
                  <p className="text-gray-400 mb-6">
                    {searchQuery
                      ? "Try changing your search query"
                      : "Start by creating a new document"}
                  </p>
                  <Link
                    href="/"
                    className="px-4 py-2 bg-[#1A479D] text-white rounded-lg hover:bg-[#153A82] transition-colors"
                  >
                    Create New Document
                  </Link>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Login Modal - Would be implemented separately */}
      {showLoginModal && (
        <div>Login Modal Placeholder</div>
      )}

      {/* Signup Modal - Would be implemented separately */}
      {showSignupModal && (
        <div>Signup Modal Placeholder</div>
      )}
    </div>
  );
}