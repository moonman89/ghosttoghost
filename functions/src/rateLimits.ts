import { getFirestore, Timestamp } from "firebase-admin/firestore";

const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX = 30;
const CHAT_WINDOW_MS = 60_000;
const CHAT_MAX = 15;
const BURST_WINDOW_MS = 10_000;
const BURST_MAX = 5;
const DUPLICATE_WINDOW_MS = 10_000;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export async function checkRateLimits(
  senderId: string,
  chatId: string,
  text?: string
): Promise<RateLimitResult> {
  const db = getFirestore();
  const now = Date.now();

  const globalRef = db
    .collection("system")
    .doc("rateLimits")
    .collection("users")
    .doc(senderId);

  const chatRef = globalRef.collection("chats").doc(chatId);

  return db.runTransaction(async (tx) => {
    const [globalSnap, chatSnap] = await Promise.all([
      tx.get(globalRef),
      tx.get(chatRef),
    ]);

    const global = globalSnap.data() as
      | { windowStartMs: number; count: number }
      | undefined;

    const globalActive =
      global && now - global.windowStartMs <= GLOBAL_WINDOW_MS;
    const globalCount = globalActive ? global.count : 0;

    if (globalActive && globalCount >= GLOBAL_MAX) {
      return { allowed: false, reason: "global_rate_limit" };
    }

    const chat = chatSnap.data() as
      | {
          windowStartMs: number;
          count: number;
          burstStartMs: number;
          burstCount: number;
          lastText?: string;
          lastTextAtMs?: number;
        }
      | undefined;

    const chatWindowActive =
      chat && now - chat.windowStartMs <= CHAT_WINDOW_MS;
    const chatCount = chatWindowActive ? chat.count : 0;

    const burstActive = chat && now - chat.burstStartMs <= BURST_WINDOW_MS;
    const burstCount = burstActive ? chat.burstCount : 0;

    if (chatWindowActive && chatCount >= CHAT_MAX) {
      return { allowed: false, reason: "chat_rate_limit" };
    }
    if (burstActive && burstCount >= BURST_MAX) {
      return { allowed: false, reason: "burst_rate_limit" };
    }

    if (text && chat?.lastText === text.trim() && chat.lastTextAtMs) {
      if (now - chat.lastTextAtMs < DUPLICATE_WINDOW_MS) {
        return { allowed: false, reason: "duplicate_message" };
      }
    }

    const nextGlobalCount = globalActive ? globalCount + 1 : 1;
    const nextGlobalStart = globalActive ? global!.windowStartMs : now;

    const nextChatCount = chatWindowActive ? chatCount + 1 : 1;
    const nextChatStart = chatWindowActive ? chat!.windowStartMs : now;
    const nextBurstCount = burstActive ? burstCount + 1 : 1;
    const nextBurstStart = burstActive ? chat!.burstStartMs : now;

    tx.set(
      globalRef,
      { windowStartMs: nextGlobalStart, count: nextGlobalCount },
      { merge: true }
    );

    tx.set(
      chatRef,
      {
        windowStartMs: nextChatStart,
        count: nextChatCount,
        burstStartMs: nextBurstStart,
        burstCount: nextBurstCount,
        lastText: text?.trim() ?? chat?.lastText ?? null,
        lastTextAtMs: text ? now : chat?.lastTextAtMs ?? null,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return { allowed: true };
  });
}
