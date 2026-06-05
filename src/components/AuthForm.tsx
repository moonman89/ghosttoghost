"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymous, signInWithGhostToken, signOut } from "@/lib/auth";
import { registerGhost, loginGhost } from "@/lib/ghost";
import { useAuth } from "@/context/AuthContext";
import GhostLogo from "@/components/GhostLogo";

type AuthMode = "welcome" | "create" | "signin";

function normalizePin(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

function mapGhostError(err: unknown): string {
  const code = (err as { code?: string }).code;
  if (code === "functions/not-found") return "Ghost not found — check username";
  if (code === "functions/permission-denied") return "Wrong PIN";
  if (code === "functions/already-exists") return "Username is already taken";
  if (code === "functions/failed-precondition") {
    const message = (err as { message?: string }).message ?? "";
    if (message.includes("expired")) return "Ghost expired — create a new one";
    return message || "Could not sign in";
  }
  if (code === "functions/invalid-argument") {
    return (err as { message?: string }).message ?? "Invalid input";
  }
  if (code === "functions/unauthenticated") {
    return "Session error — try again";
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

export default function AuthForm() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("welcome");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmed = username.trim().toLowerCase();
    let signedInThisAttempt = false;

    try {
      if (trimmed.length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }
      if (pin.length !== 4) {
        setError("PIN must be exactly 4 digits.");
        return;
      }

      if (user) {
        await signOut();
      }

      await signInAnonymous();
      signedInThisAttempt = true;

      await registerGhost(trimmed, pin);
      await refreshProfile();
      router.replace("/chat");
    } catch (err) {
      if (signedInThisAttempt) {
        await signOut().catch(() => {});
      }
      setError(mapGhostError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmed = username.trim().toLowerCase();

    try {
      if (trimmed.length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }
      if (pin.length !== 4) {
        setError("PIN must be exactly 4 digits.");
        return;
      }

      const { token } = await loginGhost(trimmed, pin);
      await signInWithGhostToken(token);
      await refreshProfile();
      router.replace("/chat");
    } catch (err) {
      setError(mapGhostError(err));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername("");
    setPin("");
    setError("");
    setMode("welcome");
  };

  if (user && profile) {
    return null;
  }

  return (
    <section className="entry-screen">
      <div className="entry-atmosphere" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <div className="entry-logo" aria-hidden>
        <GhostLogo size={36} className="entry-logo__icon" />
      </div>

      <div className="entry-copy">
        <p>GhostToGhost</p>
        <p>Anonymous ghost-to-ghost messaging</p>
        <p>Direct · Real-time · No identity</p>
        <p className="entry-wipe-notice">
          Every ghost self-destructs 24 hours after creation. Messages, chats,
          and your account are permanently wiped — nothing is kept.
        </p>
        {user && !profile && mode === "welcome" && (
          <p className="mt-2 opacity-70">Finish setup or start over.</p>
        )}
      </div>

      <div className="entry-form">
        {mode === "welcome" && (
          <div className="entry-actions">
            <button
              type="button"
              className="entry-enter"
              onClick={() => {
                setError("");
                setMode("create");
              }}
            >
              [ Create ghost ]
            </button>
            <button
              type="button"
              className="entry-enter"
              onClick={() => {
                setError("");
                setMode("signin");
              }}
            >
              [ Sign in ]
            </button>
            {user && !profile && (
              <button
                type="button"
                disabled={loading}
                className="entry-enter opacity-55"
                onClick={() => {
                  signOut()
                    .then(resetForm)
                    .catch(() => {});
                }}
              >
                [ Start over ]
              </button>
            )}
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="entry-actions">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
              }
              required
              minLength={3}
              maxLength={20}
              autoFocus
              className="input-field--entry"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              placeholder="4-digit PIN"
              value={pin}
              onChange={(e) => setPin(normalizePin(e.target.value))}
              required
              minLength={4}
              maxLength={4}
              autoComplete="off"
              className="input-field--entry"
            />
            {error && <p className="entry-error">{error}</p>}
            <button type="submit" disabled={loading} className="entry-enter">
              {loading ? "[ ... ]" : "[ Create ]"}
            </button>
            <button
              type="button"
              disabled={loading}
              className="entry-enter opacity-55"
              onClick={resetForm}
            >
              [ Back ]
            </button>
          </form>
        )}

        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="entry-actions">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
              }
              required
              minLength={3}
              maxLength={20}
              autoFocus
              className="input-field--entry"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              placeholder="4-digit PIN"
              value={pin}
              onChange={(e) => setPin(normalizePin(e.target.value))}
              required
              minLength={4}
              maxLength={4}
              autoComplete="off"
              className="input-field--entry"
            />
            {error && <p className="entry-error">{error}</p>}
            <button type="submit" disabled={loading} className="entry-enter">
              {loading ? "[ ... ]" : "[ Sign in ]"}
            </button>
            <button
              type="button"
              disabled={loading}
              className="entry-enter opacity-55"
              onClick={resetForm}
            >
              [ Back ]
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
