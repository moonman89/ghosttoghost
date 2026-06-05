"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymous, signOut } from "@/lib/auth";
import { createUserProfile } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";

export default function AuthForm() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEnter = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmed = username.trim().toLowerCase();
    let signedInThisAttempt = false;
    let activeUser = user;

    try {
      if (trimmed.length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }

      if (!activeUser) {
        activeUser = await signInAnonymous();
        signedInThisAttempt = true;
      }

      await createUserProfile(activeUser.uid, { username: trimmed });
      await refreshProfile();
      router.replace("/chat");
    } catch (err) {
      if (signedInThisAttempt) {
        await signOut().catch(() => {});
      }

      const code = (err as { code?: string }).code;
      if (code === "permission-denied") {
        setError(
          "Could not save profile. Deploy Firestore rules and add ghosttoghost.web.app to Auth authorized domains."
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not join");
      }
    } finally {
      setLoading(false);
    }
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

      <div className="entry-corner entry-corner--tl">G</div>
      <div className="entry-corner entry-corner--tr">H</div>
      <div className="entry-corner entry-corner--bl">O</div>
      <div className="entry-corner entry-corner--br">T</div>

      <div className="entry-copy">
        <p>GhostToGhost</p>
        <p>Anonymous / Direct / Real-time</p>
        <p>Private messaging</p>
        {user && !profile && (
          <p className="mt-2 opacity-70">Finish setup with a username.</p>
        )}
      </div>

      <form onSubmit={handleEnter} className="entry-form">
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
        <button type="submit" disabled={loading} className="entry-enter">
          {loading ? "[ ... ]" : "[ Enter ]"}
        </button>
        {user && !profile && (
          <button
            type="button"
            disabled={loading}
            className="entry-enter opacity-55"
            onClick={() => {
              signOut()
                .then(() => {
                  setUsername("");
                  setError("");
                })
                .catch(() => {});
            }}
          >
            [ Start over ]
          </button>
        )}
      </form>
    </section>
  );
}
