import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";
import { app } from "./firebase";
import { saveFcmToken } from "./firestore/fcm";

let messagingInstance: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!(await isSupported())) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
}

export async function registerPushNotifications(
  userId: string,
  options?: { requestPermission?: boolean }
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "denied") return;

  if (Notification.permission === "default") {
    if (!options?.requestPermission) return;
    const result = await Notification.requestPermission();
    if (result !== "granted") return;
  }

  const messaging = await getMessagingInstance();
  if (!messaging) return;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return;

  const registration = await navigator.serviceWorker.register(
    "/api/firebase-messaging-sw",
    { scope: "/" }
  );
  await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    await saveFcmToken(userId, token);
  }

  onMessage(messaging, () => {
    // Foreground messages are handled by the live Firestore listener.
  });
}
