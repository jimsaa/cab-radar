"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignupSuccessScreen } from "@/components/auth/SignupSuccessScreen";
import {
  readSignupSuccess,
  readSignupSuccessFromSearch,
  type SignupSuccessData,
} from "@/lib/signup-success";

export default function SignupSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SignupSuccessData | null>(null);

  useEffect(() => {
    const fromStorage = readSignupSuccess();
    const fromQuery = readSignupSuccessFromSearch(searchParams);
    const saved = fromStorage ?? fromQuery;

    if (!saved) {
      router.replace("/signup");
      return;
    }

    setData(saved);
  }, [router, searchParams]);

  if (!data) {
    return (
      <div className="safe-bottom mx-auto max-w-lg px-4 py-16 text-center text-sm text-muted">
        Laddar…
      </div>
    );
  }

  return (
    <SignupSuccessScreen
      cabradarUserId={data.cabradarUserId}
      needsEmailConfirm={data.needsEmailConfirm}
    />
  );
}
