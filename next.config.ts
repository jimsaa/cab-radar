import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Required when opening dev server from phone via LAN IP */
  allowedDevOrigins: ["192.168.0.100", "localhost"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Permissions-Policy", value: "geolocation=(self)" },
        ],
      },
    ];
  },
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
