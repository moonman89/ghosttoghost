import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { UserProfile } from "@/types";

export async function createUserProfile(
  uid: string,
  data: { username: string }
): Promise<void> {
  const usernameLower = data.username.toLowerCase();

  if (!/^[a-z0-9_]{3,20}$/.test(usernameLower)) {
    throw new Error("Username must be 3–20 characters: letters, numbers, underscore");
  }

  const existing = await getUserByUsername(usernameLower);
  if (existing && existing.uid !== uid) {
    throw new Error("Username is already taken");
  }

  const claimRef = doc(db, "usernames", usernameLower);
  const profileRef = doc(db, "users", uid);
  let claimCreated = false;

  const claimSnap = await getDoc(claimRef);
  if (!claimSnap.exists()) {
    await setDoc(claimRef, {
      uid,
      createdAt: serverTimestamp(),
    });
    claimCreated = true;
  } else if (claimSnap.data()?.uid !== uid) {
    throw new Error("Username is already taken");
  }

  try {
    await setDoc(profileRef, {
      uid,
      username: usernameLower,
      displayName: usernameLower,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (claimCreated) {
      await deleteDoc(claimRef).catch(() => {});
    }
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function getUserByUsername(
  username: string
): Promise<UserProfile | null> {
  const q = query(
    collection(db, "users"),
    where("username", "==", username.toLowerCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

export async function searchUsersByUsername(
  searchTerm: string,
  excludeUserId: string,
  maxResults = 8
): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase();
  if (term.length < 2) return [];

  const q = query(
    collection(db, "users"),
    where("username", ">=", term),
    where("username", "<=", `${term}\uf8ff`),
    orderBy("username"),
    limit(maxResults + 1)
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((user) => user.uid !== excludeUserId)
    .slice(0, maxResults);
}
