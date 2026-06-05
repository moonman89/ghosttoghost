import { FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "firebase/app-check";

export function initAppCheck(app: FirebaseApp): void {
  if (typeof window === "undefined") return;

  const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    (globalThis as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string })
      .FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  const siteKey = process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY;
  if (!siteKey) return;

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
