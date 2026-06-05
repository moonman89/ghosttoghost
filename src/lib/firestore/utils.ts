import type { Chat } from "@/types";

export function getDirectChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

export function getChatDisplayName(
  chat: Chat,
  currentUserId: string
): string {
  if (chat.type === "group" && chat.name) {
    return chat.name;
  }
  const otherMemberId = chat.memberIds.find((id) => id !== currentUserId);
  if (otherMemberId && chat.memberNames[otherMemberId]) {
    return chat.memberNames[otherMemberId];
  }
  return "Chat";
}

export function getUnreadCount(
  chat: Chat,
  userId: string
): number {
  return chat.unreadCounts?.[userId] ?? 0;
}
