import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DriverActivityShell } from "@/components/driver/DriverActivityShell";
import { Header, BottomNav } from "@/components/layout/Header";
import { TestModeBanner } from "@/components/test-mode/TestModeBanner";
import { AppToastProvider } from "@/components/ui/AppToast";
import { APP_NAME, APP_SLOGAN } from "@/lib/constants";
import { fetchLayoutAdminRole } from "@/lib/admin-access";
import { isTeslaBetaUser } from "@/lib/tesla-beta";
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
  let hideViewSwitcher = false;
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
        .select("test_mode_enabled, tesla_beta, membership_type, is_admin")
        .eq("id", user.id)
        .maybeSingle();
      testModeEnabled = Boolean(profile?.test_mode_enabled);
      hideViewSwitcher =
        Boolean(profile) && !profile?.is_admin && isTeslaBetaUser(profile);
    }
  } catch {
    // Supabase not configured yet
  }

  return (
    <html lang="sv" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <AppToastProvider>
          <Header
            isAdmin={isAdmin}
            isEmergencyAdmin={isEmergencyAdmin}
            isLoggedIn={isLoggedIn}
            hideViewSwitcher={hideViewSwitcher}
          />
          <TestModeBanner active={testModeEnabled} />
          <DriverActivityShell
            activityEnabled={isLoggedIn && !isAdmin}
            messageBannerEnabled={isLoggedIn}
          />
          <main className="flex-1">{children}</main>
          <BottomNav isLoggedIn={isLoggedIn} />
        </AppToastProvider>
      </body>
    </html>
  );
}
