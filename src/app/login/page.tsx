"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { useAuth } from "@/context/AuthContext";
import LoadingState from "@/components/ui/LoadingState";

export default function LoginPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace("/chat");
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <section className="entry-screen">
        <div className="entry-atmosphere" aria-hidden />
        <LoadingState label="Loading" />
      </section>
    );
  }

  if (user && profile) {
    return (
      <section className="entry-screen">
        <div className="entry-atmosphere" aria-hidden />
        <LoadingState label="Redirecting" />
      </section>
    );
  }

  return <AuthForm />;
}
