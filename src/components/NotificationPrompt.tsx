"use client";

import { useEffect, useState } from "react";
import { registerPushNotifications } from "@/lib/messaging";

interface NotificationPromptProps {
  userId: string;
}

export default function NotificationPrompt({ userId }: NotificationPromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setVisible(Notification.permission === "default");
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="btn-bracket text-[10px] opacity-70"
      onClick={() => {
        registerPushNotifications(userId, { requestPermission: true })
          .then(() => setVisible(false))
          .catch(() => {});
      }}
    >
      [ Notify ]
    </button>
  );
}
