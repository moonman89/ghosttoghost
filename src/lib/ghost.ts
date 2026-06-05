import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app);

export async function registerGhost(
  username: string,
  pin: string
): Promise<{ ok: boolean; expiresAt: number }> {
  const fn = httpsCallable<
    { username: string; pin: string },
    { ok: boolean; expiresAt: number }
  >(functions, "registerGhost");
  const result = await fn({ username, pin });
  return result.data;
}

export async function loginGhost(
  username: string,
  pin: string
): Promise<{ token: string; expiresAt: number }> {
  const fn = httpsCallable<
    { username: string; pin: string },
    { token: string; expiresAt: number }
  >(functions, "loginGhost");
  const result = await fn({ username, pin });
  return result.data;
}
