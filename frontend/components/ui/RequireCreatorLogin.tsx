"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreatorIdentity } from "@/lib/identity";

/**
 * Gates a page behind having logged in via World ID Selfie Check
 * (app/login) — "creators must do that" before picking up a link. Renders
 * nothing until the identity check resolves, then either the page or a
 * redirect; never a flash of dashboard content for a signed-out visitor.
 */
export function RequireCreatorLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { creator } = useCreatorIdentity();

  useEffect(() => {
    if (creator === null) router.replace("/login");
  }, [creator, router]);

  if (!creator) return null;
  return <>{children}</>;
}
