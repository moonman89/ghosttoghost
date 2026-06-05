import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";

const BATCH_SIZE = 100;
const MAX_USERS_PER_RUN = 40;

async function deleteQueryBatch(
  query: FirebaseFirestore.Query
): Promise<number> {
  const snap = await query.limit(BATCH_SIZE).get();
  if (snap.empty) return 0;

  const db = getFirestore();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

async function deleteSubcollection(collectionPath: string): Promise<void> {
  const db = getFirestore();
  const colRef = db.collection(collectionPath);
  let total = 0;
  while (true) {
    const deleted = await deleteQueryBatch(colRef);
    if (deleted === 0) break;
    total += deleted;
  }
  if (total > 0) {
    logger.info("Deleted subcollection docs", { collectionPath, total });
  }
}

async function purgeUser(uid: string, username: string): Promise<void> {
  const db = getFirestore();

  const chatsSnap = await db
    .collection("chats")
    .where("memberIds", "array-contains", uid)
    .get();

  for (const chatDoc of chatsSnap.docs) {
    const chatId = chatDoc.id;
    await deleteSubcollection(`chats/${chatId}/messages`);
    await deleteSubcollection(`chats/${chatId}/typing`);
    await chatDoc.ref.delete();

    try {
      const bucket = getStorage().bucket();
      await bucket.deleteFiles({ prefix: `chatUploads/${chatId}/${uid}/` });
    } catch (err) {
      logger.warn("Storage cleanup failed", { chatId, uid, err });
    }
  }

  await deleteSubcollection(`users/${uid}/fcmTokens`);
  await deleteSubcollection(`users/${uid}/private`);
  await db.doc(`users/${uid}`).delete();

  if (username) {
    await db.doc(`usernames/${username}`).delete().catch(() => {});
  }

  try {
    await getAuth().deleteUser(uid);
  } catch {
    // Auth user may already be removed
  }

  logger.info("Purged expired ghost", { uid, username });
}

export const purgeExpiredGhosts = onSchedule("every 1 hours", async () => {
  const db = getFirestore();
  const now = Timestamp.now();

  const snap = await db
    .collection("users")
    .where("expiresAt", "<", now)
    .limit(MAX_USERS_PER_RUN)
    .get();

  if (snap.empty) {
    logger.info("No expired ghosts to purge");
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    await purgeUser(doc.id, data.username as string);
  }

  logger.info("Purge run complete", { count: snap.size });
});
