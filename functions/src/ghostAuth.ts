import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as bcrypt from "bcryptjs";

const GHOST_TTL_MS = 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

function validatePin(pin: unknown): string {
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    throw new HttpsError("invalid-argument", "PIN must be exactly 4 digits");
  }
  return pin;
}

function validateUsername(username: unknown): string {
  if (typeof username !== "string") {
    throw new HttpsError("invalid-argument", "Invalid username");
  }
  const lower = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(lower)) {
    throw new HttpsError(
      "invalid-argument",
      "Username must be 3–20 characters: letters, numbers, underscore"
    );
  }
  return lower;
}

export const registerGhost = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in anonymously first");
  }

  const uid = request.auth.uid;
  const username = validateUsername(request.data?.username);
  const pin = validatePin(request.data?.pin);

  const db = getFirestore();
  const claimRef = db.doc(`usernames/${username}`);
  const profileRef = db.doc(`users/${uid}`);
  const credRef = db.doc(`users/${uid}/private/credentials`);

  const existingProfile = await profileRef.get();
  if (existingProfile.exists) {
    throw new HttpsError("already-exists", "Ghost already registered");
  }

  const claimSnap = await claimRef.get();
  if (claimSnap.exists && claimSnap.data()?.uid !== uid) {
    throw new HttpsError("already-exists", "Username is already taken");
  }

  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + GHOST_TTL_MS);
  const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);

  const batch = db.batch();
  if (!claimSnap.exists) {
    batch.set(claimRef, { uid, createdAt: now });
  }
  batch.set(profileRef, {
    uid,
    username,
    displayName: username,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  });
  batch.set(credRef, { pinHash, updatedAt: now });

  await batch.commit();
  return { ok: true, expiresAt: expiresAt.toMillis() };
});

export const loginGhost = onCall(async (request) => {
  const username = validateUsername(request.data?.username);
  const pin = validatePin(request.data?.pin);

  const db = getFirestore();
  const claimSnap = await db.doc(`usernames/${username}`).get();
  if (!claimSnap.exists) {
    throw new HttpsError("not-found", "Ghost not found");
  }

  const uid = claimSnap.data()?.uid as string;
  const profileSnap = await db.doc(`users/${uid}`).get();
  if (!profileSnap.exists) {
    throw new HttpsError("not-found", "Ghost not found");
  }

  const expiresAt = profileSnap.data()?.expiresAt as Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() < Date.now()) {
    throw new HttpsError("failed-precondition", "Ghost expired — create a new one");
  }

  const credSnap = await db.doc(`users/${uid}/private/credentials`).get();
  if (!credSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Account has no PIN — create a new ghost"
    );
  }

  const pinHash = credSnap.data()?.pinHash as string;
  const valid = await bcrypt.compare(pin, pinHash);
  if (!valid) {
    throw new HttpsError("permission-denied", "Wrong PIN");
  }

  const token = await getAuth().createCustomToken(uid);
  return { token, expiresAt: expiresAt.toMillis() };
});
