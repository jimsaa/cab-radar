import { AuthForm } from "@/components/auth/AuthForm";
import { BrandHeader } from "@/components/branding/BrandHeader";

export const metadata = { title: "Logga in" };

export default function LoginPage() {
  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 py-8">
      <BrandHeader title="Logga in" className="mb-6" />
      <AuthForm mode="login" />
    </div>
  );
}
