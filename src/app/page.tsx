"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingState from "@/components/ui/LoadingState";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && profile) {
      router.replace("/chat");
    } else {
      router.replace("/login");
    }
  }, [user, profile, loading, router]);

  return <LoadingState fullScreen label="Loading" />;
}
