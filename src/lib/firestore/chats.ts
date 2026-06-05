import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Chat, UserProfile } from "@/types";
import { getDirectChatId } from "./utils";

type ChatCallbacks = {
  onData: (chats: Chat[]) => void;
  onError?: (error: Error) => void;
};

export async function findExistingDirectChat(
  uid1: string,
  uid2: string
): Promise<string | null> {
  const deterministicId = getDirectChatId(uid1, uid2);

  const q = query(
    collection(db, "chats"),
    where("type", "==", "direct"),
    where("memberIds", "array-contains", uid1)
  );
  const snap = await getDocs(q);

  for (const chatDoc of snap.docs) {
    if (chatDoc.id === deterministicId) {
      return deterministicId;
    }

    const data = chatDoc.data() as Chat;
    if (
      data.memberIds.length === 2 &&
      data.memberIds.includes(uid2)
    ) {
      return chatDoc.id;
    }
  }

  return null;
}

export async function findOrCreateDirectChat(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<string> {
  const existingId = await findExistingDirectChat(
    currentUser.uid,
    otherUser.uid
  );
  if (existingId) {
    return existingId;
  }

  const chatId = getDirectChatId(currentUser.uid, otherUser.uid);
  await setDoc(doc(db, "chats", chatId), {
    type: "direct",
    memberIds: [currentUser.uid, otherUser.uid],
    memberNames: {
      [currentUser.uid]: currentUser.displayName,
      [otherUser.uid]: otherUser.displayName,
    },
    unreadCounts: {
      [currentUser.uid]: 0,
      [otherUser.uid]: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return chatId;
}

export async function createGroupChat(
  creator: UserProfile,
  name: string,
  memberProfiles: UserProfile[]
): Promise<string> {
  const allMembers = [creator, ...memberProfiles];
  const uniqueMembers = Array.from(
    new Map(allMembers.map((m) => [m.uid, m])).values()
  );

  const memberNames: Record<string, string> = {};
  const unreadCounts: Record<string, number> = {};
  uniqueMembers.forEach((m) => {
    memberNames[m.uid] = m.displayName;
    unreadCounts[m.uid] = 0;
  });

  const chatRef = await addDoc(collection(db, "chats"), {
    type: "group",
    name,
    memberIds: uniqueMembers.map((m) => m.uid),
    memberNames,
    unreadCounts,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return chatRef.id;
}

export function subscribeToChats(
  userId: string,
  callbacks: ChatCallbacks
): Unsubscribe {
  const q = query(
    collection(db, "chats"),
    where("memberIds", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const chats: Chat[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Chat, "id">),
      }));
      callbacks.onData(chats);
    },
    (error) => {
      callbacks.onError?.(error);
    }
  );
}
