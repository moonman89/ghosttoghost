import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

function tokenDocId(token: string): string {
  return token.slice(-32).replace(/[^a-zA-Z0-9]/g, "_");
}

export async function saveFcmToken(
  userId: string,
  token: string
): Promise<void> {
  await setDoc(doc(db, "users", userId, "fcmTokens", tokenDocId(token)), {
    token,
    platform: "web",
    updatedAt: serverTimestamp(),
  });
}
