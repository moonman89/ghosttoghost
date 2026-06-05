type FirestoreDate = { toDate?: () => Date } | null | undefined;

export function formatMessageTime(date: FirestoreDate): string {
  if (!date || typeof date.toDate !== "function") return "";
  return date.toDate().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSidebarTime(date: FirestoreDate): string {
  if (!date || typeof date.toDate !== "function") return "";
  const d = date.toDate();
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatDateSeparator(date: FirestoreDate): string {
  if (!date || typeof date.toDate !== "function") return "";
  const d = date.toDate();
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function getDateKey(date: FirestoreDate): string {
  if (!date || typeof date.toDate !== "function") return "";
  return date.toDate().toDateString();
}

export function getLastMessagePreview(
  chat: {
    lastMessage?: string;
    lastMessageSenderId?: string;
  },
  currentUserId: string
): string {
  if (!chat.lastMessage) return "No messages yet";
  const prefix =
    chat.lastMessageSenderId === currentUserId ? "You: " : "";
  return `${prefix}${chat.lastMessage}`;
}
