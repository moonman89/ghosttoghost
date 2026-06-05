import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";

interface PushPayload {
  chatId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  preview: string;
  recipientIds: string[];
}

async function collectTokens(userIds: string[]): Promise<string[]> {
  const db = getFirestore();
  const tokens: string[] = [];

  await Promise.all(
    userIds.map(async (uid) => {
      const snap = await db
        .collection("users")
        .doc(uid)
        .collection("fcmTokens")
        .get();
      snap.docs.forEach((doc) => {
        const token = doc.data().token as string | undefined;
        if (token) tokens.push(token);
      });
    })
  );

  return [...new Set(tokens)];
}

export async function sendMessagePushNotifications(
  payload: PushPayload
): Promise<void> {
  const recipients = payload.recipientIds.filter(
    (id) => id !== payload.senderId
  );
  if (recipients.length === 0) return;

  const tokens = await collectTokens(recipients);
  if (tokens.length === 0) return;

  try {
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: payload.senderName,
        body: payload.preview,
      },
      data: {
        chatId: payload.chatId,
        messageId: payload.messageId,
        type: "new_message",
      },
      webpush: {
        fcmOptions: {
          link: `/chat?open=${payload.chatId}`,
        },
      },
    });

    if (response.failureCount > 0) {
      logger.warn("Some push notifications failed", {
        chatId: payload.chatId,
        failureCount: response.failureCount,
      });
    }
  } catch (error) {
    logger.error("Push notification dispatch failed", {
      chatId: payload.chatId,
      error,
    });
  }
}
