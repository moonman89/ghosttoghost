"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymous, signInWithGhostToken, signOut } from "@/lib/auth";
import { registerGhost, loginGhost } from "@/lib/ghost";
import { useAuth } from "@/context/AuthContext";
import GhostLogo from "@/components/GhostLogo";

type Step = "username" | "pin";
type Action = "enter" | "create";

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
  const [step, setStep] = useState<Step>("username");
  const [action, setAction] = useState<Action | null>(null);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const trimmedUsername = username.trim().toLowerCase();

  const validateUsername = (): boolean => {
    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return false;
    }
    setError("");
    return true;
  };

  const goToPin = (nextAction: Action) => {
    if (!validateUsername()) return;
    setAction(nextAction);
    setPin("");
    setError("");
    setStep("pin");
  };

  const goBack = () => {
    setStep("username");
    setAction(null);
    setPin("");
    setError("");
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    let signedInThisAttempt = false;

    try {
      if (!validateUsername()) return;
      if (pin.length !== 4) {
        setError("PIN must be exactly 4 digits.");
        return;
      }

      if (user) {
        await signOut();
      }

      await signInAnonymous();
      signedInThisAttempt = true;

      await registerGhost(trimmedUsername, pin);
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

    try {
      if (!validateUsername()) return;
      if (pin.length !== 4) {
        setError("PIN must be exactly 4 digits.");
        return;
      }

      const { token } = await loginGhost(trimmedUsername, pin);
      await signInWithGhostToken(token);
      await refreshProfile();
      router.replace("/chat");
    } catch (err) {
      setError(mapGhostError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = (e: FormEvent) => {
    if (action === "create") return handleCreate(e);
    return handleSignIn(e);
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

      <div className="entry-layout">
        <div className="entry-copy">
          <p>GhostToGhost</p>
          <p>Anonymous ghost-to-ghost messaging</p>
          <p>Direct · Real-time · No identity</p>
          <p className="entry-wipe-notice">
            Every ghost self-destructs 24 hours after creation. Messages, chats,
            and your account are permanently wiped — nothing is kept.
          </p>
          {user && !profile && step === "username" && (
            <p className="mt-2 opacity-70">Finish setup or start over.</p>
          )}
        </div>

        <div className="entry-center">
          <GhostLogo size={32} className="entry-logo__icon" title="GhostToGhost" />

          <div className="entry-form">
            {step === "username" && (
              <div className="entry-actions">
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
                {error && <p className="entry-error">{error}</p>}
                <div className="entry-cta-row">
                  <button
                    type="button"
                    className="entry-enter"
                    disabled={loading}
                    onClick={() => goToPin("enter")}
                  >
                    [ Enter ]
                  </button>
                  <button
                    type="button"
                    className="entry-enter"
                    disabled={loading}
                    onClick={() => goToPin("create")}
                  >
                    [ Create ghost ]
                  </button>
                </div>
                {user && !profile && (
                  <button
                    type="button"
                    disabled={loading}
                    className="entry-enter opacity-55"
                    onClick={() => {
                      signOut()
                        .then(() => {
                          setUsername("");
                          setPin("");
                          setError("");
                          setStep("username");
                          setAction(null);
                        })
                        .catch(() => {});
                    }}
                  >
                    [ Start over ]
                  </button>
                )}
              </div>
            )}

            {step === "pin" && action && (
              <form onSubmit={handlePinSubmit} className="entry-actions">
                <p className="entry-pin-label">@{trimmedUsername}</p>
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
                  autoFocus
                  autoComplete="off"
                  className="input-field--entry"
                />
                {error && <p className="entry-error">{error}</p>}
                <button type="submit" disabled={loading} className="entry-enter">
                  {loading
                    ? "[ ... ]"
                    : action === "create"
                      ? "[ Create ]"
                      : "[ Enter ]"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className="entry-enter opacity-55"
                  onClick={goBack}
                >
                  [ Back ]
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
