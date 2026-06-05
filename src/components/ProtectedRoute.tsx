"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

interface ProtectedRouteProps {
  children: ReactNode;
  requireProfile?: boolean;
}

export default function ProtectedRoute({
  children,
  requireProfile = true,
}: ProtectedRouteProps) {
  const { user, profile, loading, error, refreshProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireProfile && !profile) {
      router.replace("/login");
    }
  }, [user, profile, loading, requireProfile, router]);

  if (loading) {
    return <LoadingState fullScreen />;
  }

  if (error) {
    return (
      <ErrorState
        fullScreen
        message={error}
        onRetry={() => refreshProfile()}
      />
    );
  }

  if (!user || (requireProfile && !profile)) {
    return <LoadingState fullScreen label="Redirecting" />;
  }

  return <>{children}</>;
}
