import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { checkRateLimits } from "./rateLimits";
import { sendMessagePushNotifications } from "./pushNotifications";

const MAX_UNREAD_COUNT = 500;

type MessageType = "text" | "image";

interface MessageDoc {
  senderId: string;
  senderName: string;
  text?: string;
  imageUrl?: string;
  storagePath?: string;
  type: MessageType;
  readBy: string[];
  createdAt?: Timestamp;
  sideEffectsStatus?: string;
}

interface ChatDoc {
  memberIds: string[];
  memberNames?: Record<string, string>;
  unreadCounts?: Record<string, number>;
  lastProcessedMessageId?: string;
}

function previewFromMessage(message: MessageDoc): string {
  if (message.type === "image") return "Photo";
  return (message.text ?? "").slice(0, 120);
}

function isValidStoragePath(
  storagePath: string,
  chatId: string,
  senderId: string
): boolean {
  const parts = storagePath.split("/");
  if (parts.length !== 4 || storagePath.length > 512) return false;
  return (
    parts[0] === "chatUploads"
    && parts[1] === chatId
    && parts[2] === senderId
    && /^\d+_.+$/.test(parts[3])
  );
}

function isValidImageUrl(imageUrl: string, storagePath: string): boolean {
  try {
    const url = new URL(imageUrl);
    const encodedPath = encodeURIComponent(storagePath);
    return (
      (url.hostname.includes("firebasestorage.googleapis.com") ||
        url.hostname.includes("storage.googleapis.com")) &&
      (url.pathname.includes(storagePath) ||
        url.pathname.includes(encodedPath) ||
        imageUrl.includes(storagePath))
    );
  } catch {
    return false;
  }
}

function validateImageMessage(
  message: MessageDoc,
  chatId: string,
  senderId: string
): string | null {
  if (!message.storagePath) {
    return "Image messages require storagePath";
  }
  if (!message.imageUrl) {
    return "Image messages require imageUrl";
  }
  if (!isValidStoragePath(message.storagePath, chatId, senderId)) {
    return "storagePath is not owned by sender or chat";
  }
  if (!isValidImageUrl(message.imageUrl, message.storagePath)) {
    return "imageUrl does not match storagePath";
  }
  return null;
}

function buildUnreadCounts(
  memberIds: string[],
  senderId: string,
  existing: Record<string, number> = {}
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const memberId of memberIds) {
    const current = existing[memberId] ?? 0;
    if (memberId === senderId) {
      next[memberId] = current;
    } else {
      next[memberId] = Math.min(current + 1, MAX_UNREAD_COUNT);
    }
  }
  return next;
}

async function markMessageStatus(
  chatId: string,
  messageId: string,
  status: string,
  reason?: string
): Promise<void> {
  const db = getFirestore();
  await db
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .doc(messageId)
    .update({
      sideEffectsStatus: status,
      ...(reason ? { sideEffectsReason: reason } : {}),
    });
}

export const onMessageCreated = onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    const chatId = event.params.chatId;
    const messageId = event.params.messageId;
    const message = event.data?.data() as MessageDoc | undefined;

    if (!message) {
      logger.warn("Message create event missing data", { chatId, messageId });
      return;
    }

    const db = getFirestore();
    const chatRef = db.collection("chats").doc(chatId);
    const messageRef = chatRef.collection("messages").doc(messageId);

    const senderId = message.senderId;
    if (!senderId || typeof senderId !== "string") {
      await markMessageStatus(chatId, messageId, "rejected", "missing_sender");
      return;
    }

    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      await markMessageStatus(chatId, messageId, "rejected", "chat_not_found");
      return;
    }

    const chat = chatSnap.data() as ChatDoc;

    if (!Array.isArray(chat.memberIds) || !chat.memberIds.includes(senderId)) {
      await markMessageStatus(
        chatId,
        messageId,
        "rejected",
        "sender_not_member"
      );
      logger.warn("Sender not in chat members", { chatId, messageId, senderId });
      return;
    }

    if (message.type === "image") {
      const imageError = validateImageMessage(message, chatId, senderId);
      if (imageError) {
        await markMessageStatus(chatId, messageId, "rejected", imageError);
        logger.warn("Invalid image message", { chatId, messageId, imageError });
        return;
      }
    }

    if (message.type === "text" && (!message.text || message.text.trim().length === 0)) {
      await markMessageStatus(chatId, messageId, "rejected", "empty_text");
      return;
    }

    const rateResult = await checkRateLimits(
      senderId,
      chatId,
      message.type === "text" ? message.text : undefined
    );
    if (!rateResult.allowed) {
      await markMessageStatus(
        chatId,
        messageId,
        "rate_limited",
        rateResult.reason
      );
      logger.warn("Rate limit exceeded", {
        chatId,
        messageId,
        senderId,
        reason: rateResult.reason,
      });
      return;
    }

    const preview = previewFromMessage(message);

    try {
      await db.runTransaction(async (tx) => {
        const freshChat = await tx.get(chatRef);
        if (!freshChat.exists) {
          throw new Error("chat_not_found");
        }

        const chatData = freshChat.data() as ChatDoc;

        if (chatData.lastProcessedMessageId === messageId) {
          return;
        }

        const unreadCounts = buildUnreadCounts(
          chatData.memberIds,
          senderId,
          chatData.unreadCounts ?? {}
        );

        tx.update(chatRef, {
          lastMessage: preview,
          lastMessageAt: message.createdAt ?? FieldValue.serverTimestamp(),
          lastMessageSenderId: senderId,
          updatedAt: FieldValue.serverTimestamp(),
          unreadCounts,
          lastProcessedMessageId: messageId,
        });

        tx.update(messageRef, {
          sideEffectsStatus: "applied",
          sideEffectsAppliedAt: FieldValue.serverTimestamp(),
        });
      });

      await sendMessagePushNotifications({
        chatId,
        messageId,
        senderId,
        senderName: message.senderName,
        preview,
        recipientIds: chat.memberIds,
      });
    } catch (error) {
      logger.error("Failed to apply message side effects", {
        chatId,
        messageId,
        error,
      });
      await markMessageStatus(chatId, messageId, "error", "transaction_failed");
    }
  }
);

function newReadByEntries(before: string[], after: string[]): string[] {
  const beforeSet = new Set(before);
  return after.filter((uid) => !beforeSet.has(uid));
}

export const onMessageReadReceipt = onDocumentUpdated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    const chatId = event.params.chatId;
    const before = event.data?.before.data() as MessageDoc | undefined;
    const after = event.data?.after.data() as MessageDoc | undefined;

    if (!before || !after) return;

    const beforeReadBy = Array.isArray(before.readBy) ? before.readBy : [];
    const afterReadBy = Array.isArray(after.readBy) ? after.readBy : [];

    if (afterReadBy.length <= beforeReadBy.length) return;

    const newlyRead = newReadByEntries(beforeReadBy, afterReadBy);
    if (newlyRead.length === 0) return;

    const db = getFirestore();
    const chatRef = db.collection("chats").doc(chatId);

    await db.runTransaction(async (tx) => {
      const chatSnap = await tx.get(chatRef);
      if (!chatSnap.exists) return;

      const chat = chatSnap.data() as ChatDoc;
      const unreadCounts = { ...(chat.unreadCounts ?? {}) };

      for (const uid of newlyRead) {
        if (!chat.memberIds.includes(uid)) continue;
        unreadCounts[uid] = 0;
      }

      tx.update(chatRef, { unreadCounts });
    });
  }
);
