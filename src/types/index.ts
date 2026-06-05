import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Chat {
  id: string;
  type: "direct" | "group";
  name?: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageSenderId?: string;
  unreadCounts?: Record<string, number>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  imageUrl?: string;
  storagePath?: string;
  type: "text" | "image";
  createdAt: Timestamp;
  readBy: string[];
  sideEffectsStatus?: string;
}

export interface TypingStatus {
  userId: string;
  username: string;
  isTyping: boolean;
  updatedAt: Timestamp;
}

export interface FirestoreSubscription<T> {
  data: T;
  loading: boolean;
  error: string | null;
}
