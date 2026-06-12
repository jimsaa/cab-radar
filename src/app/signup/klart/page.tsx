import type { Metadata } from "next";
import { Suspense } from "react";
import SignupSuccessPage from "./page.client";

export const metadata: Metadata = { title: "Förarkonto skapat" };

export default function SignupKlartPage() {
  return (
    <Suspense
      fallback={
        <div className="safe-bottom mx-auto max-w-lg px-4 py-16 text-center text-sm text-muted">
          Laddar…
        </div>
      }
    >
      <SignupSuccessPage />
    </Suspense>
  );
}
