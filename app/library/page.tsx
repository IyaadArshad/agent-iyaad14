"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load documents from the API - optimized with proper error handling and caching
  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        // Try to get cached documents from sessionStorage for immediate display
        const cachedDocuments = sessionStorage.getItem("cachedDocuments");
        if (cachedDocuments) {
          const parsedDocs = JSON.parse(cachedDocuments);
          setDocuments(parsedDocs);
          setFilteredDocuments(parsedDocs);
          setTotalPages(Math.ceil(parsedDocs.length / itemsPerPage));
        }

        // Fetch fresh documents from API (non-blocking)
        const response = await fetch("https://database.acroford.com/files", {
          headers: {
            Accept: "application/json",
          },
          // Add a cache control header to leverage browser caching
          cache: "default",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.status}`);
        }

        const data = await response.json();

        // Process documents in batches to prevent browser freezing
        const processDocuments = (startIndex: number, batchSize: number) => {
          const endIndex = Math.min(startIndex + batchSize, data.length);
          const batch = data.slice(startIndex, endIndex).map((file: any) => {
            const fileData = file.data || {};
            const latestVersion = fileData.latestVersion || 0;
            const versionData = (fileData.versions && fileData.versions[latestVersion]) || {};

            // Extract title and preview more efficiently
            let title = file.file_name.replace(/\.md$/, "");
            let preview = "";

            if (typeof versionData === "string") {
              // Limit content processing to first 500 characters for preview extraction
              const contentPreview = versionData.substring(0, 500);

              // Extract first paragraph for preview
              const paragraphEnd = contentPreview.indexOf("\n\n");
              preview =
                paragraphEnd > -1
                  ? contentPreview.substring(0, paragraphEnd)
                  : contentPreview.substring(0, 100);

              // Try to extract title from first heading
              const titleMatch = contentPreview.match(/^# (.+)/m);
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

          if (startIndex === 0) {
            setDocuments(batch);
            setFilteredDocuments(batch);
          } else {
            setDocuments((prev) => [...prev, ...batch]);
            setFilteredDocuments((prev) => [...prev, ...batch]);
          }

          // Continue processing documents in batches
          if (endIndex < data.length) {
            setTimeout(() => processDocuments(endIndex, batchSize), 0);
          } else {
            // All documents processed - update pagination and cache
            const allDocs = [...batch];
            setTotalPages(Math.ceil(allDocs.length / itemsPerPage));

            // Cache the processed documents
            try {
              sessionStorage.setItem("cachedDocuments", JSON.stringify(allDocs));
              sessionStorage.setItem("documentsTimestamp", Date.now().toString());
            } catch (e) {
              console.warn("Failed to cache documents in sessionStorage", e);
            }

            setIsLoading(false);
          }
        };

        // Start processing in batches of 20 documents
        processDocuments(0, 20);
      } catch (error) {
        console.error("Error fetching documents:", error);
        setLoadError(error instanceof Error ? error.message : "Failed to load documents");
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

  // Optimized document filtering with debounce and memoization
  const debouncedSearch = useCallback(
    (query: string) => {
      if (query.trim() === "") {
        setFilteredDocuments(documents);
        setTotalPages(Math.ceil(documents.length / itemsPerPage));
        setCurrentPage(1);
        return;
      }

      const normalized = query.toLowerCase();

      // Use more efficient filtering
      const filtered = documents.filter((doc) => {
        const titleMatch = doc.title.toLowerCase().includes(normalized);
        // Only check filename if title doesn't match
        return titleMatch || doc.fileName.toLowerCase().includes(normalized);
      });

      setFilteredDocuments(filtered);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
      setCurrentPage(1);
    },
    [documents, itemsPerPage]
  );

  // Apply debounce to search
  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  // Memoized current page items to prevent unnecessary re-calculations
  const currentPageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDocuments.slice(startIndex, endIndex);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  // Format date for display - memoized
  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }, []);

  // Handle new chat
  const handleNewChat = () => {
    router.push("/");
  };

  // Optimized document click handler - prevent memory leaks
  const handleDocumentClick = useCallback(
    (doc: Document) => {
      try {
        // Create recent doc object
        const recentDoc = {
          id: doc.id,
          name: doc.title,
          lastOpened: new Date(),
        };

        // Update recents more efficiently
        const storedRecents = localStorage.getItem("recentDocuments");
        let recents = storedRecents ? JSON.parse(storedRecents) : [];

        // Remove if already exists using filter instead of loop
        recents = recents.filter((item: any) => item.id !== doc.id);

        // Add to beginning and limit to 10
        recents.unshift(recentDoc);
        recents = recents.slice(0, 10);

        // Save back to localStorage
        localStorage.setItem("recentDocuments", JSON.stringify(recents));
      } catch (error) {
        console.error("Error updating recent documents:", error);
      } finally {
        // Always navigate even if local storage fails
        router.push(`/document/${doc.id}`);
      }
    },
    [router]
  );

  // Pagination handlers - memoized
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);

      // Scroll back to top when changing page
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);

      // Scroll back to top when changing page
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  // Handle login/signup modals
  const handleLoginClick = useCallback(() => {
    setShowLoginModal(true);
  }, []);

  const handleSignupClick = useCallback(() => {
    setShowSignupModal(true);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
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
            <div className="relative max-w-xs">
              <SearchIcon
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A479D] focus:border-transparent w-full"
              />
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          {isLoading && documents.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gray-200 mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : loadError ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-red-500">{loadError}</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {filteredDocuments.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {currentPageItems.map((doc) => (
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
      {showLoginModal && <div>Login Modal Placeholder</div>}

      {/* Signup Modal - Would be implemented separately */}
      {showSignupModal && <div>Signup Modal Placeholder</div>}
    </div>
  );
}