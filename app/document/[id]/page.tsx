"use client";
import { useState, useEffect } from "react";
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

  // Fetch document and its versions from the API
  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://database.acroford.com/files?id=eq.${documentId}`, {
          headers: {
            Accept: "application/json",
          },
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
        
        // Add document to recent documents
        if (doc.data) {
          const docTitle = doc.data.name || doc.file_name;
          addToRecentDocuments(doc.id, docTitle);
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        setIsLoading(false);
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
  }, [documentId]);

  // Add document to recent documents list
  const addToRecentDocuments = (id: string, title: string) => {
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
  };

  // Handle version selection
  const handleVersionSelect = (versionNumber: number) => {
    setCurrentVersion(versionNumber);
    const versionContent = versions.find(v => v.versionNumber === versionNumber)?.content || "";
    setEditContent(versionContent);
    if (isEditing) {
      setIsEditing(false);
    }
  };

  // Handle editing toggle
  const toggleEditing = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      // When entering edit mode, set the content to the current version
      const versionContent = versions.find(v => v.versionNumber === currentVersion)?.content || "";
      setEditContent(versionContent);
    }
  };

  // Handle saving new version
  const saveNewVersion = async () => {
    if (!document || !currentVersion) return;
    
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    
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
      
      // Update local state with new version
      const updatedDoc = await response.json();
      if (updatedDoc && updatedDoc[0]) {
        setDocument(updatedDoc[0]);
        
        // Add the new version to the versions array
        const newVersion: Version = {
          versionNumber: newVersionNumber,
          content: editContent,
          timestamp: new Date().toISOString()
        };
        
        setVersions([newVersion, ...versions]);
        setCurrentVersion(newVersionNumber);
        setSaveSuccess(true);
        
        // Exit edit mode after saving
        setTimeout(() => {
          setIsEditing(false);
          setSaveSuccess(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Error saving document:", error);
      setSaveError("Failed to save document. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date";
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  // Handle new chat
  const handleNewChat = () => {
    router.push("/");
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
                    className="flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <XCircle size={16} className="mr-1.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={saveNewVersion}
                    disabled={isSaving}
                    className={cn(
                      "flex items-center px-3 py-1.5 rounded-lg text-white",
                      isSaving 
                        ? "bg-gray-400 cursor-not-allowed" 
                        : "bg-[#1A479D] hover:bg-[#153A82]"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1.5"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        {saveSuccess ? (
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
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 flex">
          {/* Versions sidebar */}
          {showVersionsPanel && (
            <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-sm font-medium text-gray-900">Document Versions</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {versions.length} {versions.length === 1 ? "version" : "versions"}
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {versions.map((version) => (
                  <button
                    key={version.versionNumber}
                    onClick={() => handleVersionSelect(version.versionNumber)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-gray-100",
                      currentVersion === version.versionNumber && "bg-blue-50"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn(
                        "text-sm font-medium",
                        currentVersion === version.versionNumber ? "text-blue-600" : "text-gray-900"
                      )}>
                        Version {version.versionNumber}
                      </span>
                      {version.versionNumber === document?.data?.latestVersion && (
                        <span className="text-xs bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full">
                          Latest
                        </span>
                      )}
                    </div>
                    {version.timestamp && (
                      <p className="text-xs text-gray-500">
                        {formatDate(version.timestamp)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document content */}
          <div className={cn("flex-1 overflow-y-auto bg-white", isEditing ? "p-0" : "p-6")}>
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1A479D]"></div>
              </div>
            ) : (
              <>
                {isEditing ? (
                  <div className="h-full">
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
                      content={versions.find(v => v.versionNumber === currentVersion)?.content || ""}
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