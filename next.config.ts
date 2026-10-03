import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // keeps the ffmpeg binary path real instead of a bundler-rewritten one
  serverExternalPackages: ["ffmpeg-static"],
  // the binary has to be bundled with the functions that cut and clean video
  outputFileTracingIncludes: { "/api/studio/**": ["./node_modules/ffmpeg-static/ffmpeg*"] },
  // lets the marketing landing page be previewed locally at 127.0.0.1, since
  // "localhost" itself is treated as the app host by the middleware
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
