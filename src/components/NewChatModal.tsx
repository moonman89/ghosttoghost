"use client";

import { useState, FormEvent } from "react";
import {
  getUserByUsername,
  findOrCreateDirectChat,
  createGroupChat,
} from "@/lib/firestore";
import UserSearch from "@/components/UserSearch";
import type { UserProfile } from "@/types";

interface NewChatModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

type Tab = "direct" | "group";

export default function NewChatModal({
  currentUser,
  onClose,
  onChatCreated,
}: NewChatModalProps) {
  const [tab, setTab] = useState<Tab>("direct");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDirectChat = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const otherUser =
        selectedUser ?? (await getUserByUsername(username.trim()));

      if (!otherUser) {
        setError("User not found. Search or enter a valid username.");
        return;
      }
      if (otherUser.uid === currentUser.uid) {
        setError("You cannot chat with yourself.");
        return;
      }

      const chatId = await findOrCreateDirectChat(currentUser, otherUser);
      onChatCreated(chatId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create chat");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChat = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!groupName.trim()) {
        setError("Group name is required.");
        return;
      }

      const usernames = memberInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (usernames.length === 0) {
        setError("Add at least one member username.");
        return;
      }

      const members: UserProfile[] = [];
      for (const name of usernames) {
        const user = await getUserByUsername(name);
        if (!user) {
          setError(`User not found: ${name}`);
          return;
        }
        if (user.uid !== currentUser.uid) {
          members.push(user);
        }
      }

      const chatId = await createGroupChat(
        currentUser,
        groupName.trim(),
        members
      );
      onChatCreated(chatId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="label-xs">New conversation</h2>
          <button type="button" onClick={onClose} className="btn-bracket">
            [ Close ]
          </button>
        </div>

        <div className="modal-tabs">
          <button
            type="button"
            onClick={() => setTab("direct")}
            className={`filter-btn ${tab === "direct" ? "active" : ""}`}
          >
            Direct
          </button>
          <button
            type="button"
            onClick={() => setTab("group")}
            className={`filter-btn ${tab === "group" ? "active" : ""}`}
          >
            Group
          </button>
        </div>

        {tab === "direct" ? (
          <form onSubmit={handleDirectChat} className="flex flex-col gap-4">
            <div>
              <label className="label-xs mb-2 block">Find user</label>
              <UserSearch
                currentUserId={currentUser.uid}
                onSelect={(user) => {
                  setSelectedUser(user);
                  setUsername(user.username);
                  setError("");
                }}
              />
            </div>
            <div>
              <label htmlFor="direct-username" className="label-xs mb-2 block">
                Or enter username
              </label>
              <input
                id="direct-username"
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => {
                  setUsername(
                    e.target.value.replace(/[^a-zA-Z0-9_]/g, "")
                  );
                  setSelectedUser(null);
                }}
                className="input-field"
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="btn-primary w-full"
            >
              {loading ? "Opening..." : "[ Start chat ]"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleGroupChat} className="flex flex-col gap-4">
            <div>
              <label htmlFor="group-name" className="label-xs mb-2 block">
                Group name
              </label>
              <input
                id="group-name"
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="group-members" className="label-xs mb-2 block">
                Members
              </label>
              <textarea
                id="group-members"
                placeholder="usernames, comma-separated"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                required
                rows={3}
                className="input-field resize-none"
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Creating..." : "[ Create group ]"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
