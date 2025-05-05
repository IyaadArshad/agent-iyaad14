import React from "react";
import { FolderIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  UserCircleIcon,
  MoreVerticalIcon,
  LogOutIcon,
  LogInIcon,
  BarChart2Icon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

function NavUser({
  user = {
    name: "Guest User",
    email: "guest@datamation.lk",
    avatar: "/icons/user-male-circle.png",
    isGuest: true,
  },
  collapsed = false,
  onLoginClick = () => {},
  onSignupClick = () => {},
  onLogout = () => {},
}: {
  user?: {
    name: string;
    email: string;
    avatar: string;
    isGuest?: boolean;
  };
  collapsed?: boolean;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onLogout?: () => void;
}) {
  return (
    <div
      className={
        collapsed
          ? "mt-auto py-2 flex justify-center"
          : "mt-auto px-3 py-2 border-t border-gray-200"
      }
    >
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className={
                    collapsed
                      ? "p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      : "flex items-center w-full p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  }
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <>
                      <div className="flex-1 text-left text-sm leading-tight ml-3">
                        <span className="block font-medium truncate">
                          {user.name}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {user.email}
                        </span>
                      </div>
                      <MoreVerticalIcon className="ml-auto size-4 text-gray-500" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Account</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent
          className="w-56 rounded-lg"
          align="end"
          side="right"
          sideOffset={8}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-3 px-2 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {user.isGuest ? (
              <>
                <DropdownMenuItem onClick={onLoginClick}>
                  <LogInIcon className="mr-2 h-4 w-4" />
                  Sign In
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSignupClick}>
                  <UserCircleIcon className="mr-2 h-4 w-4" />
                  Create Account
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={onLogout}>
                <LogOutIcon className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <BarChart2Icon className="mr-2 h-4 w-4" />
              Usage
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Update interface to match page.tsx type definitions
interface Conversation {
  id: string;
  title: string;
  date: Date;
  messages?: any[]; // Add messages property (optional for sidebar purposes)
}

interface RecentDocument {
  id: string;
  name: string;
  lastOpened: Date;
}

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  conversationHistory: Conversation[];
  recentDocuments: RecentDocument[];
  activeConversationId?: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onOpenLibrary?: () => void;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onLogout?: () => void;
  onSelectDocument?: (id: string) => void;
}

export function Sidebar({
  isCollapsed,
  toggleSidebar,
  conversationHistory,
  recentDocuments,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onOpenLibrary = () => {},
  onLoginClick = () => {},
  onSignupClick = () => {},
  onLogout = () => {},
  onSelectDocument = () => {},
}: SidebarProps) {
  const router = useRouter();

  // Group conversations by date: today, previous 7 days, previous 30 days
  const todaysDate = new Date().setHours(0, 0, 0, 0);
  const previous7Days = new Date(todaysDate);
  previous7Days.setDate(previous7Days.getDate() - 7);
  const previous30Days = new Date(todaysDate);
  previous30Days.setDate(previous30Days.getDate() - 30);

  const todayConversations = conversationHistory.filter(
    (item) => new Date(item.date).setHours(0, 0, 0, 0) === todaysDate
  );
  const last7DaysConversations = conversationHistory.filter((item) => {
    const itemDate = new Date(item.date).setHours(0, 0, 0, 0);
    return itemDate < todaysDate && itemDate >= previous7Days.getTime();
  });
  const last30DaysConversations = conversationHistory.filter((item) => {
    const itemDate = new Date(item.date).setHours(0, 0, 0, 0);
    return (
      itemDate < previous7Days.getTime() && itemDate >= previous30Days.getTime()
    );
  });

  // Handle document selection
  const handleDocumentClick = (docId: string) => {
    if (onSelectDocument) {
      onSelectDocument(docId);
    } else {
      router.push(`/document/${docId}`);
    }
  };

  // Get user data from local storage
  const getUserFromLocalStorage = () => {
    if (typeof window !== "undefined") {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          return JSON.parse(userData);
        }
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }
    return {
      name: "Guest User",
      email: "guest@datamation.lk",
      avatar: "/icons/user-male-circle.png",
      isGuest: true,
    };
  };

  // Handle logout
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      // Reload page to update state
      window.location.reload();
    }
    if (onLogout) {
      onLogout();
    }
  };

  // Get current user
  const currentUser = getUserFromLocalStorage();

  return (
    <aside
      className={cn(
        "h-screen bg-[#F0F4F9] border-r border-gray-200 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Top section: collapse, then search, then new draft (all icons, no text) */}
      <div
        className={cn(
          "p-2 flex items-center gap-2",
          isCollapsed ? "flex-col" : "flex-row justify-between"
        )}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:cursor-pointer hover:bg-gray-200 transition-colors"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <Image
                    alt="Sidebar"
                    width={26}
                    height={26}
                    src="/icons/sidebar.png"
                  />
                ) : (
                  <Image
                    alt="Sidebar"
                    width={28}
                    height={28}
                    src="/icons/sidebar.png"
                  />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div
          className={cn(
            "flex",
            isCollapsed ? "flex-col gap-2" : "flex-row gap-2 ml-auto"
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-2 hover:cursor-pointer rounded-lg hover:bg-gray-200 transition-colors"
                  aria-label="Search chats"
                >
                  <Image
                    alt="Search"
                    width={24}
                    height={24}
                    src="/icons/search.png"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Search chats</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onNewChat}
                  className="p-2 rounded-lg hover:cursor-pointer bg-[#1A479D] hover:bg-[#153A82] text-white transition-colors"
                  aria-label="New draft"
                >
                  <Image
                    alt="New conversation icon"
                    width={22}
                    height={22}
                    src="/icons/create.png"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">New draft</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Separator className="my-2 bg-gray-200" />

      {/* Library button */}
      <div className={cn("p-2", isCollapsed ? "flex justify-center" : "")}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenLibrary}
                className={cn(
                  "flex items-center hover:cursor-pointer rounded-lg transition-colors",
                  isCollapsed
                    ? "p-2 hover:bg-gray-100"
                    : "px-3 py-2 w-full hover:bg-gray-100 text-left"
                )}
              >
                <Image
                  alt="Library icon"
                  width={24}
                  height={24}
                  src="/icons/folders.png"
                />
                {!isCollapsed && <span className="ml-2 text-sm">Library</span>}
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">Library</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {!isCollapsed && (
        <>
          <Separator className="my-2 bg-gray-200" />

          {/* Recently opened documents Section - Only show if there are recent documents */}
          {recentDocuments.length > 0 && (
            <>
              <div className="px-3 py-2">
                <h3 className="text-xs font-medium text-gray-500 px-2 pb-3 py-1">
                  Recently opened documents
                </h3>
                {recentDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc.id)}
                    className="flex items-center w-full px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm transition-colors"
                  >
                    <div className="flex items-center truncate">
                      <FolderIcon className="h-4 w-4 mr-2 text-[#1A479D] flex-shrink-0" />
                      <span className="text-gray-700 truncate">{doc.name}</span>
                    </div>
                  </button>
                ))}
              </div>
              <Separator className="my-2 bg-gray-200" />
            </>
          )}

          {/* Conversation History Section */}
          <div className="flex-1 overflow-y-auto px-3">
            {/* Show message if no conversations */}
            {conversationHistory.length === 0 && (
              <div className="text-xs text-gray-500 px-2 py-3">
                No conversation history
              </div>
            )}

            {/* Today */}
            {todayConversations.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-gray-500 px-2 pb-3 py-1">
                  Today
                </h3>
                {todayConversations.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectConversation(item.id)}
                    className={cn(
                      "flex items-center w-full px-3 py-2 rounded-lg text-left text-sm transition-colors mb-1",
                      activeConversationId === item.id
                        ? "bg-[#EBF2FF] text-[#1A479D]"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </>
            )}
            {/* Previous 7 Days */}
            {last7DaysConversations.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-gray-500 px-2 py-1 pb-3 mt-2">
                  Previous 7 Days
                </h3>
                {last7DaysConversations.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectConversation(item.id)}
                    className={cn(
                      "flex items-center w-full px-3 py-2 rounded-lg text-left text-sm transition-colors mb-1",
                      activeConversationId === item.id
                        ? "bg-[#EBF2FF] text-[#1A479D]"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </>
            )}
            {/* Previous 30 Days */}
            {last30DaysConversations.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-gray-500 px-2 py-1 mt-2">
                  Previous 30 Days
                </h3>
                {last30DaysConversations.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectConversation(item.id)}
                    className={cn(
                      "flex items-center w-full px-3 py-2 rounded-lg text-left text-sm transition-colors mb-1",
                      activeConversationId === item.id
                        ? "bg-[#EBF2FF] text-[#1A479D]"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* User section at the bottom */}
      <NavUser
        user={currentUser}
        collapsed={isCollapsed}
        onLoginClick={onLoginClick}
        onSignupClick={onSignupClick}
        onLogout={handleLogout}
      />
    </aside>
  );
}