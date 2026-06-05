"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { app } from "@/lib/firebase";
import { initAppCheck } from "@/lib/appCheck";
import { registerPushNotifications } from "@/lib/messaging";

export default function FirebaseBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    initAppCheck(app);
  }, []);

  useEffect(() => {
    if (!user) return;
    registerPushNotifications(user.uid).catch(() => {});
  }, [user]);

  return null;
}
