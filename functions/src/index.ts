import { initializeApp } from "firebase-admin/app";

initializeApp();

export { onMessageCreated, onMessageReadReceipt } from "./messageSideEffects";
export { registerGhost, loginGhost } from "./ghostAuth";
export { purgeExpiredGhosts } from "./purgeExpired";
