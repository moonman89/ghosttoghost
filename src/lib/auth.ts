import {
  signInAnonymously,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

export async function signInAnonymous(): Promise<User> {
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function signInWithGhostToken(token: string): Promise<User> {
  const credential = await signInWithCustomToken(auth, token);
  return credential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
