import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${API_URL}/auth/:path*` },
      { source: "/users/:path*", destination: `${API_URL}/users/:path*` },
      { source: "/departments/:path*", destination: `${API_URL}/departments/:path*` },
      { source: "/subjects/:path*", destination: `${API_URL}/subjects/:path*` },
      { source: "/requests/:path*", destination: `${API_URL}/requests/:path*` },
      { source: "/materials/:path*", destination: `${API_URL}/materials/:path*` },
    ];
  },
};

export default nextConfig;
