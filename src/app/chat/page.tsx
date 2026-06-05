"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ChatSidebar from "@/components/ChatSidebar";
import ChatWindow from "@/components/ChatWindow";
import NewChatModal from "@/components/NewChatModal";
import EmptyState from "@/components/ui/EmptyState";
import GhostLogo from "@/components/GhostLogo";
import { subscribeToChats } from "@/lib/firestore";
import type { Chat } from "@/types";

function ChatPageContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToChats(profile.uid, {
      onData: setChats,
    });
    return unsubscribe;
  }, [profile]);

  useEffect(() => {
    const openChatId = searchParams.get("open");
    if (!openChatId || chats.length === 0) return;

    const exists = chats.some((chat) => chat.id === openChatId);
    if (exists) {
      setSelectedChatId(openChatId);
      setShowChatOnMobile(true);
    }
  }, [searchParams, chats]);

  if (!profile) return null;

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setShowChatOnMobile(true);
  };

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId);
    setShowChatOnMobile(true);
  };

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-hidden>
        <GhostLogo size={14} className="opacity-45" />
        <GhostLogo size={14} className="opacity-45" />
      </aside>

      <div className="app-main">
        <header className="site-header">
          <div className="flex items-center gap-2.5">
            <GhostLogo size={16} />
            <span className="wordmark">GhostToGhost</span>
          </div>
          <span className="label-xs opacity-55">Messages</span>
          <button
            type="button"
            onClick={() => setShowNewChat(true)}
            className="btn-bracket"
          >
            [ New ]
          </button>
        </header>

        <div className="chat-layout">
          <div
            className={`h-full w-full md:block md:w-auto ${
              showChatOnMobile && selectedChat ? "hidden" : "block"
            }`}
          >
            <ChatSidebar
              currentUser={profile}
              selectedChatId={selectedChatId}
              onSelectChat={handleSelectChat}
              onNewChat={() => setShowNewChat(true)}
            />
          </div>

          <div
            className={`h-full min-w-0 flex-1 ${
              showChatOnMobile && selectedChat ? "block" : "hidden md:block"
            }`}
          >
            {selectedChat ? (
              <ChatWindow
                chat={selectedChat}
                currentUser={profile}
                onBack={() => setShowChatOnMobile(false)}
              />
            ) : (
              <EmptyState
                title="Messages"
                description="Select a conversation or start a new one."
                actionLabel="[ New chat ]"
                onAction={() => setShowNewChat(true)}
              />
            )}
          </div>
        </div>
      </div>

      {showNewChat && (
        <NewChatModal
          currentUser={profile}
          onClose={() => setShowNewChat(false)}
          onChatCreated={handleChatCreated}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <ChatPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
