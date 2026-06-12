"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { BrandHeader } from "@/components/branding/BrandHeader";

export function SignupFlow() {
  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 py-8">
      <BrandHeader title="Gå med i CabRadar" className="mb-6" />
      <AuthForm mode="signup" />
    </div>
  );
}
