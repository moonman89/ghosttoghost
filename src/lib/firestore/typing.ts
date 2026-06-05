import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import type { TypingStatus, UserProfile } from "@/types";

type TypingCallbacks = {
  onData: (typers: TypingStatus[]) => void;
  onError?: (error: Error) => void;
};

function isRecentlyActive(updatedAt: Timestamp): boolean {
  const fiveSecondsAgo = Date.now() - 5000;
  return updatedAt.toMillis() > fiveSecondsAgo;
}

export async function setTypingIndicator(
  chatId: string,
  user: UserProfile,
  isTyping: boolean
): Promise<void> {
  await setDoc(doc(db, "chats", chatId, "typing", user.uid), {
    userId: user.uid,
    username: user.displayName,
    isTyping,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToTyping(
  chatId: string,
  currentUserId: string,
  callbacks: TypingCallbacks
): Unsubscribe {
  return onSnapshot(
    collection(db, "chats", chatId, "typing"),
    (snapshot) => {
      const typers = snapshot.docs
        .map((d) => d.data() as TypingStatus)
        .filter(
          (t) =>
            t.isTyping &&
            t.userId !== currentUserId &&
            isRecentlyActive(t.updatedAt)
        );
      callbacks.onData(typers);
    },
    (error) => {
      callbacks.onError?.(error);
    }
  );
}
