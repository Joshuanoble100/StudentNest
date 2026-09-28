import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Object-storage providers used by the storage abstraction layer.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "api.mapbox.com" },
    ],
  },
};

export default nextConfig;
