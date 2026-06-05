"use client";

import { useEffect, useState } from "react";
import { searchUsersByUsername } from "@/lib/firestore";
import type { UserProfile } from "@/types";

interface UserSearchProps {
  currentUserId: string;
  onSelect: (user: UserProfile) => void;
  placeholder?: string;
}

export default function UserSearch({
  currentUserId,
  onSelect,
  placeholder = "Search username",
}: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const users = await searchUsersByUsername(term, currentUserId);
        setResults(users);
        if (users.length === 0) {
          setError("No users found");
        }
      } catch (err) {
        setResults([]);
        setError(
          err instanceof Error ? err.message : "Search failed"
        );
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  return (
    <div>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) =>
          setQuery(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
        }
        className="input-field"
      />

      {loading && (
        <p className="body-small mt-2">Searching...</p>
      )}

      {error && !loading && query.trim().length >= 2 && (
        <p className="error-text mt-2">{error}</p>
      )}

      {results.length > 0 && (
        <ul className="user-search-results mt-2">
          {results.map((user) => (
            <li key={user.uid}>
              <button
                type="button"
                onClick={() => {
                  onSelect(user);
                  setQuery(user.username);
                  setResults([]);
                }}
                className="user-search-item"
              >
                <span className="label-xs normal-case tracking-normal">
                  @{user.username}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
