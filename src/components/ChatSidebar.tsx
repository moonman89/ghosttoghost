"use client";

import { useEffect, useState } from "react";
import {
  subscribeToChats,
  getChatDisplayName,
  getUnreadCount,
} from "@/lib/firestore";
import { formatSidebarTime, getLastMessagePreview } from "@/lib/format";
import { signOut } from "@/lib/auth";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import NotificationPrompt from "@/components/NotificationPrompt";
import type { Chat, UserProfile } from "@/types";

interface ChatSidebarProps {
  currentUser: UserProfile;
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({
  currentUser,
  selectedChatId,
  onSelectChat,
  onNewChat,
}: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToChats(currentUser.uid, {
      onData: (nextChats) => {
        setChats(nextChats);
        setLoading(false);
        setError(null);
      },
      onError: (err) => {
        setError(err.message);
        setLoading(false);
      },
    });

    return unsubscribe;
  }, [currentUser.uid]);

  const filteredChats = chats.filter((chat) => {
    if (!search.trim()) return true;
    const name = getChatDisplayName(chat, currentUser.uid).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const totalUnread = chats.reduce(
    (sum, chat) => sum + getUnreadCount(chat, currentUser.uid),
    0
  );

  return (
    <aside className="panel flex h-full w-full flex-col md:w-80 md:min-w-80 md:max-w-80">
      <div className="panel-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="label-xs truncate">@{currentUser.username}</p>
            {totalUnread > 0 && (
              <span className="unread-badge" title="Total unread">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <p className="body-small mt-1 truncate">Ghost</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <NotificationPrompt userId={currentUser.uid} />
          <button type="button" onClick={() => signOut()} className="btn-bracket">
            [ Logout ]
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--hs-line-subtle)] p-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search chats"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={onNewChat}
            className="btn-icon shrink-0"
            title="New chat"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <LoadingState label="Loading chats" />}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {!loading && !error && filteredChats.length === 0 && (
          <EmptyState
            title={search ? "No matches" : "No conversations"}
            description={
              search
                ? "Try a different search term."
                : "Start a new chat to begin messaging."
            }
            actionLabel={search ? undefined : "[ New chat ]"}
            onAction={search ? undefined : onNewChat}
          />
        )}

        {!loading &&
          !error &&
          filteredChats.map((chat) => {
            const displayName = getChatDisplayName(chat, currentUser.uid);
            const isSelected = chat.id === selectedChatId;
            const unread = getUnreadCount(chat, currentUser.uid);
            const hasUnread = unread > 0;

            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => onSelectChat(chat.id)}
                className={`chat-row ${isSelected ? "selected" : ""} ${
                  hasUnread ? "chat-row--unread" : ""
                }`}
              >
                <div className="chat-avatar">
                  {chat.type === "group"
                    ? "G"
                    : displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="chat-row-name label-xs truncate normal-case tracking-normal">
                      {displayName}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {chat.lastMessageAt && (
                        <span className="label-xs opacity-45">
                          {formatSidebarTime(chat.lastMessageAt)}
                        </span>
                      )}
                      {hasUnread && (
                        <span className="unread-badge">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                  <p
                    className={`body-small mt-1 truncate ${
                      hasUnread ? "font-medium text-[var(--hs-blue)]" : ""
                    }`}
                  >
                    {getLastMessagePreview(chat, currentUser.uid)}
                  </p>
                </div>
              </button>
            );
          })}
      </div>
    </aside>
  );
}
