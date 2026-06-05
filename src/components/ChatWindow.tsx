"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import {
  subscribeToMessages,
  subscribeToTyping,
  sendTextMessage,
  sendImageMessage,
  markMessagesAsRead,
  setTypingIndicator,
  getChatDisplayName,
} from "@/lib/firestore";
import { formatDateSeparator, getDateKey } from "@/lib/format";
import MessageBubble from "./MessageBubble";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import type { Chat, Message, TypingStatus, UserProfile } from "@/types";

interface ChatWindowProps {
  chat: Chat;
  currentUser: UserProfile;
  onBack?: () => void;
}

export default function ChatWindow({
  chat,
  currentUser,
  onBack,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typers, setTypers] = useState<TypingStatus[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [typingError, setTypingError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = getChatDisplayName(chat, currentUser.uid);

  useEffect(() => {
    setMessagesLoading(true);
    setMessagesError(null);

    const unsubMessages = subscribeToMessages(chat.id, {
      onData: (nextMessages) => {
        setMessages(nextMessages);
        setMessagesLoading(false);
        setMessagesError(null);
      },
      onError: (err) => {
        setMessagesError(err.message);
        setMessagesLoading(false);
      },
    });

    const unsubTyping = subscribeToTyping(chat.id, currentUser.uid, {
      onData: setTypers,
      onError: (err) => setTypingError(err.message),
    });

    return () => {
      unsubMessages();
      unsubTyping();
      setTypingIndicator(chat.id, currentUser, false);
    };
  }, [chat.id, currentUser]);

  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead(chat.id, currentUser.uid, messages).catch(() => {});
    }
  }, [chat.id, currentUser.uid, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typers]);

  const handleTyping = useCallback(() => {
    setTypingIndicator(chat.id, currentUser, true).catch(() => {});
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setTypingIndicator(chat.id, currentUser, false).catch(() => {});
    }, 2000);
  }, [chat.id, currentUser]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setSendError(null);
    setText("");
    setTypingIndicator(chat.id, currentUser, false).catch(() => {});
    try {
      await sendTextMessage(chat.id, currentUser, trimmed);
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Failed to send message"
      );
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files are supported.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      await sendImageMessage(chat.id, currentUser, file, setUploadProgress);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const typingLabel =
    typers.length === 1
      ? `${typers[0].username} is typing`
      : typers.length > 1
        ? `${typers.map((t) => t.username).join(", ")} are typing`
        : null;

  const messagesWithDates = useMemo(() => {
    const items: Array<
      | { type: "date"; key: string; label: string }
      | { type: "message"; key: string; message: Message }
    > = [];
    let lastDateKey = "";

    messages.forEach((message) => {
      const dateKey = getDateKey(message.createdAt);
      if (dateKey && dateKey !== lastDateKey) {
        items.push({
          type: "date",
          key: `date-${dateKey}`,
          label: formatDateSeparator(message.createdAt),
        });
        lastDateKey = dateKey;
      }
      items.push({ type: "message", key: message.id, message });
    });

    return items;
  }, [messages]);

  return (
    <div className="flex h-full flex-1 flex-col bg-[var(--hs-white)]">
      <header className="panel-header">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="btn-bracket md:hidden"
            >
              [ Back ]
            </button>
          )}
          <div className="chat-avatar">
            {chat.type === "group" ? "G" : displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="label-xs normal-case tracking-normal">
              {displayName}
            </h2>
            {chat.type === "group" && (
              <p className="body-small mt-1">
                {chat.memberIds.length} members
              </p>
            )}
            {typingLabel && (
              <p className="label-xs mt-1 opacity-55">{typingLabel}</p>
            )}
            {typingError && (
              <p className="error-text mt-1">{typingError}</p>
            )}
          </div>
        </div>
      </header>

      <div className="message-area">
        {messagesLoading && <LoadingState label="Loading messages" />}

        {!messagesLoading && messagesError && (
          <ErrorState message={messagesError} />
        )}

        {!messagesLoading && !messagesError && messages.length === 0 && (
          <EmptyState
            title="No messages"
            description="Send the first message in this conversation."
          />
        )}

        {!messagesLoading &&
          !messagesError &&
          messagesWithDates.map((item) =>
            item.type === "date" ? (
              <div key={item.key} className="date-separator">
                <span className="label-xs opacity-55">{item.label}</span>
              </div>
            ) : (
              <MessageBubble
                key={item.key}
                message={item.message}
                isOwn={item.message.senderId === currentUser.uid}
                chatMemberCount={chat.memberIds.length}
              />
            )
          )}
        <div ref={messagesEndRef} />
      </div>

      {(uploading || uploadError || sendError) && (
        <div className="status-bar">
          {uploading && (
            <div className="upload-progress">
              <div className="upload-progress-track">
                <div
                  className="upload-progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="label-xs">Uploading {uploadProgress}%</span>
            </div>
          )}
          {uploadError && <p className="error-text">{uploadError}</p>}
          {sendError && <p className="error-text">{sendError}</p>}
        </div>
      )}

      <footer className="composer">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending}
          className="btn-icon shrink-0"
          title="Upload image"
        >
          {uploading ? "…" : "+"}
        </button>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Write a message"
          rows={1}
          disabled={sending || uploading}
          className="composer-input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending || uploading}
          className="btn-primary shrink-0 !px-4 !py-2.5"
        >
          {sending ? "..." : "Send"}
        </button>
      </footer>
    </div>
  );
}
