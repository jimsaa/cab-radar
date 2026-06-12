import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header, BottomNav } from "@/components/layout/Header";
import { TestModeBanner } from "@/components/test-mode/TestModeBanner";
import { APP_NAME, APP_SLOGAN } from "@/lib/constants";
import { fetchLayoutAdminRole } from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a1628",
};

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_SLOGAN}`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_SLOGAN,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  formatDetection: { telephone: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let isAdmin = false;
  let isEmergencyAdmin = false;
  let isLoggedIn = false;
  let testModeEnabled = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      isLoggedIn = true;
      const role = await fetchLayoutAdminRole(supabase, user.id);
      isAdmin = role.isAdmin;
      isEmergencyAdmin = role.isEmergencyAdmin;
      const { data: profile } = await supabase
        .from("profiles")
        .select("test_mode_enabled")
        .eq("id", user.id)
        .maybeSingle();
      testModeEnabled = Boolean(profile?.test_mode_enabled);
    }
  } catch {
    // Supabase not configured yet
  }

  return (
    <html lang="sv" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <Header
          isAdmin={isAdmin}
          isEmergencyAdmin={isEmergencyAdmin}
          isLoggedIn={isLoggedIn}
        />
        <TestModeBanner active={testModeEnabled} />
        <main className="flex-1">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
