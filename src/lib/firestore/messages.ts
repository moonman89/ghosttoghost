import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Message, UserProfile } from "@/types";
import { uploadChatImage } from "./uploads";

type MessageCallbacks = {
  onData: (messages: Message[]) => void;
  onError?: (error: Error) => void;
};

export function subscribeToMessages(
  chatId: string,
  callbacks: MessageCallbacks
): Unsubscribe {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, "id">),
      }));
      callbacks.onData(messages);
    },
    (error) => {
      callbacks.onError?.(error);
    }
  );
}

export async function sendTextMessage(
  chatId: string,
  sender: UserProfile,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: sender.uid,
    senderName: sender.displayName,
    text: trimmed,
    type: "text",
    readBy: [sender.uid],
    createdAt: serverTimestamp(),
  });
}

export async function sendImageMessage(
  chatId: string,
  sender: UserProfile,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  const { url, path } = await uploadChatImage(
    chatId,
    sender.uid,
    file,
    onProgress
  );

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: sender.uid,
    senderName: sender.displayName,
    imageUrl: url,
    storagePath: path,
    type: "image",
    readBy: [sender.uid],
    createdAt: serverTimestamp(),
  });
}

export async function markMessagesAsRead(
  chatId: string,
  userId: string,
  messages: Message[]
): Promise<void> {
  const unread = messages.filter(
    (m) => m.senderId !== userId && !m.readBy.includes(userId)
  );
  if (unread.length === 0) return;

  const batch = writeBatch(db);
  unread.forEach((m) => {
    const msgRef = doc(db, "chats", chatId, "messages", m.id);
    batch.update(msgRef, { readBy: [...m.readBy, userId] });
  });
  await batch.commit();
}
