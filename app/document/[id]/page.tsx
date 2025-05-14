"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { 
  ChevronLeft, 
  Save, 
  Edit2, 
  Clock, 
  XCircle,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addRecentDocument, RecentDocument } from "@/lib/utils";
import { AnimatedMarkdown } from "@/components/AnimatedMarkdown";

interface Document {
  id: string;
  file_name: string;
  data: {
    name: string;
    latestVersion: number;
    versions: {
      [key: string]: string | any;
    };
  };
  last_modified?: string;
}

interface Version {
  versionNumber: number;
  content: string;
  timestamp?: string;
}

export default function DocumentPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [document, setDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showVersionsPanel, setShowVersionsPanel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Refs for performance optimization
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch document and its versions from the API - optimized with caching
  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      // Cancel any ongoing requests when component unmounts or when documentId changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      try {
        // Check session storage for cached document
        const cachedDoc = sessionStorage.getItem(`document_${documentId}`);
        if (cachedDoc) {
          const parsedDoc = JSON.parse(cachedDoc);
          const cachedTimestamp = sessionStorage.getItem(`document_${documentId}_timestamp`);
          
          // Use cached document if it's less than 5 minutes old
          if (cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < 300000) {
            setDocument(parsedDoc.document);
            setVersions(parsedDoc.versions);
            setCurrentVersion(parsedDoc.currentVersion);
            setEditContent(parsedDoc.latestContent);
            
            // Add to recent documents
            if (parsedDoc.document?.data) {
              const docTitle = parsedDoc.document.data.name || parsedDoc.document.file_name;
              addToRecentDocuments(parsedDoc.document.id, docTitle);
            }
            
            setIsLoading(false);
            
            // Fetch in background for updates
            fetchFromAPI(true);
            return;
          }
        }
        
        // No valid cache, fetch from API
        await fetchFromAPI(false);
        
      } catch (error) {
        console.error("Error in document fetch flow:", error);
        setLoadError(error instanceof Error ? error.message : "Failed to load document");
        setIsLoading(false);
      }
    };
    
    // Separate function to fetch from API
    const fetchFromAPI = async (isBackgroundFetch: boolean) => {
      try {
        if (!isBackgroundFetch) {
          setIsLoading(true);
        }
        
        const response = await fetch(`https://database.acroford.com/files?id=eq.${documentId}`, {
          headers: {
            Accept: "application/json",
          },
          signal: abortControllerRef.current?.signal,
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch document");
        }
        
        const data = await response.json();
        if (!data || data.length === 0) {
          throw new Error("Document not found");
        }
        
        const doc = data[0];
        setDocument(doc);
        
        // Process versions
        const fileData = doc.data || {};
        const latestVersion = fileData.latestVersion || 0;
        const versionsObj = fileData.versions || {};
        
        const versionsArray: Version[] = Object.entries(versionsObj)
          .map(([key, value]) => ({
            versionNumber: parseInt(key),
            content: typeof value === 'string' ? value : JSON.stringify(value),
            // We don't have actual timestamps for versions, so this is a placeholder
            timestamp: new Date(Date.now() - parseInt(key) * 86400000).toISOString(),
          }))
          .sort((a, b) => b.versionNumber - a.versionNumber);
        
        setVersions(versionsArray);
        setCurrentVersion(latestVersion);
        
        // Set edit content to the latest version
        const latestContent = versionsArray.find(v => v.versionNumber === latestVersion)?.content || "";
        setEditContent(latestContent);
        
        // Cache the document data
        try {
          const cacheData = {
            document: doc,
            versions: versionsArray,
            currentVersion: latestVersion,
            latestContent,
          };
          sessionStorage.setItem(`document_${documentId}`, JSON.stringify(cacheData));
          sessionStorage.setItem(`document_${documentId}_timestamp`, Date.now().toString());
        } catch (e) {
          console.warn("Failed to cache document:", e);
        }
        
        // Add document to recent documents
        if (doc.data) {
          const docTitle = doc.data.name || doc.file_name;
          addToRecentDocuments(doc.id, docTitle);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Request was aborted, do nothing
          return;
        }
        console.error("Error fetching document:", error);
        if (!isBackgroundFetch) {
          setLoadError(error instanceof Error ? error.message : "Failed to load document");
        }
      } finally {
        if (!isBackgroundFetch) {
          setIsLoading(false);
        }
      }
    };

    // Load conversation history and recent documents from localStorage
    const loadUserData = () => {
      try {
        const storedHistory = localStorage.getItem("conversationHistory");
        if (storedHistory) {
          setConversationHistory(JSON.parse(storedHistory));
        }
        
        const storedRecents = localStorage.getItem("recentDocuments");
        if (storedRecents) {
          setRecentDocuments(JSON.parse(storedRecents));
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    
    fetchDocument();
    loadUserData();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [documentId]);

  // Add document to recent documents list - memoized to prevent re-creation
  const addToRecentDocuments = useCallback((id: string, title: string) => {
    try {
      const recentDoc: RecentDocument = {
        id,
        name: title,
        lastOpened: new Date(),
      };
      
      // Call the utility function to add to recent documents
      addRecentDocument(recentDoc);
      
      // Update local state
      const storedRecents = localStorage.getItem("recentDocuments");
      if (storedRecents) {
        setRecentDocuments(JSON.parse(storedRecents));
      }
    } catch (error) {
      console.error("Error updating recent documents:", error);
    }
  }, []);

  // Handle version selection - memoized
  const handleVersionSelect = useCallback((versionNumber: number) => {
    setCurrentVersion(versionNumber);
    const versionContent = versions.find(v => v.versionNumber === versionNumber)?.content || "";
    setEditContent(versionContent);
    if (isEditing) {
      setIsEditing(false);
    }
  }, [versions, isEditing]);

  // Handle editing toggle - memoized
  const toggleEditing = useCallback(() => {
    setIsEditing(prevState => {
      if (!prevState) {
        // When entering edit mode, set the content to the current version
        const versionContent = versions.find(v => v.versionNumber === currentVersion)?.content || "";
        setEditContent(versionContent);
      }
      return !prevState;
    });
  }, [versions, currentVersion]);

  // Handle saving new version - memoized with optimistic updates
  const saveNewVersion = useCallback(async () => {
    if (!document || !currentVersion) return;
    
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    
    // Make a copy of the previous versions for rollback if needed
    const previousVersions = [...versions];
    
    try {
      // Prepare the new version data
      const newVersionNumber = document.data.latestVersion + 1;
      const updatedData = {
        ...document.data,
        latestVersion: newVersionNumber,
        versions: {
          ...document.data.versions,
          [newVersionNumber]: editContent
        }
      };
      
      // Optimistically update UI
      const newVersion: Version = {
        versionNumber: newVersionNumber,
        content: editContent,
        timestamp: new Date().toISOString()
      };
      
      setVersions([newVersion, ...versions]);
      setCurrentVersion(newVersionNumber);
      
      // Update document in local state optimistically
      const optimisticDocument = {
        ...document,
        data: updatedData
      };
      setDocument(optimisticDocument);
      
      // Update the document in the database
      const response = await fetch(`https://database.acroford.com/files?id=eq.${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          data: updatedData,
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to save document");
      }
      
      // Update local state with server response
      const updatedDoc = await response.json();
      if (updatedDoc && updatedDoc[0]) {
        setDocument(updatedDoc[0]);
        setSaveSuccess(true);
        
        // Update cache
        try {
          const cacheData = {
            document: updatedDoc[0],
            versions: [newVersion, ...versions],
            currentVersion: newVersionNumber,
            latestContent: editContent,
          };
          sessionStorage.setItem(`document_${documentId}`, JSON.stringify(cacheData));
          sessionStorage.setItem(`document_${documentId}_timestamp`, Date.now().toString());
        } catch (e) {
          console.warn("Failed to update document cache:", e);
        }
        
        // Exit edit mode after saving
        setTimeout(() => {
          setIsEditing(false);
          setSaveSuccess(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Error saving document:", error);
      setSaveError("Failed to save document. Please try again.");
      
      // Rollback optimistic updates
      setVersions(previousVersions);
      if (document) {
        setCurrentVersion(document.data.latestVersion);
      }
    } finally {
      setIsSaving(false);
    }
  }, [document, currentVersion, documentId, editContent, versions]);

  // Format date for display - memoized
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "Unknown date";
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }, []);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    router.push("/");
  }, [router]);
  
  // Memoize current version content to avoid unnecessary recalculations
  const currentVersionContent = useMemo(() => {
    return versions.find(v => v.versionNumber === currentVersion)?.content || "";
  }, [versions, currentVersion]);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={() => setIsCollapsed(!isCollapsed)}
        conversationHistory={conversationHistory}
        recentDocuments={recentDocuments}
        onNewChat={handleNewChat}
        onSelectConversation={(id) => router.push("/")}
      />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 py-3 px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/library" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-xl font-medium text-gray-900">
                {isLoading ? "Loading..." : document?.data?.name || document?.file_name || "Document"}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowVersionsPanel(!showVersionsPanel)}
                className="flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Clock size={16} className="mr-1.5" />
                <span>Versions</span>
              </button>
              {!isEditing ? (
                <button
                  onClick={toggleEditing}
                  className="flex items-center px-3 py-1.5 rounded-lg bg-[#1A479D] text-white hover:bg-[#153A82]"
                >
                  <Edit2 size={16} className="mr-1.5" />
                  <span>Edit</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleEditing}
                    className="flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <XCircle size={16} className="mr-1.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={saveNewVersion}
                    disabled={isSaving}
                    className={cn(
                      "flex items-center px-3 py-1.5 rounded-lg bg-[#1A479D] text-white",
                      isSaving ? "opacity-70 cursor-not-allowed" : "hover:bg-[#153A82]"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-r-transparent rounded-full mr-1.5"></div>
                        <span>Saving...</span>
                      </>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle size={16} className="mr-1.5" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-1.5" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 flex overflow-hidden">
          {showVersionsPanel && (
            <div className="w-64 border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Document Versions</h3>
                <div className="space-y-2">
                  {versions.map((version) => (
                    <button
                      key={version.versionNumber}
                      onClick={() => handleVersionSelect(version.versionNumber)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm",
                        currentVersion === version.versionNumber
                          ? "bg-[#1A479D] text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <div className="font-medium">Version {version.versionNumber}</div>
                      <div className="text-xs opacity-80">
                        {version.timestamp ? formatDate(version.timestamp) : "Date unknown"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
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
              <>
                {isEditing ? (
                  <div className="h-full relative">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full p-6 border-0 focus:outline-none font-mono text-base resize-none"
                      placeholder="Enter document content here..."
                    />
                    {saveError && (
                      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {saveError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="prose prose-blue max-w-none">
                    <AnimatedMarkdown 
                      content={currentVersionContent}
                      messageId={`doc-${documentId}-v${currentVersion}`}
                      onAnimationComplete={() => {}}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}