/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ical-generator", "node-ical", "razorpay", "twilio"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/ical/:roomId.ics",
        destination: "/api/ical/:roomId",
      },
    ];
  },
};

export default nextConfig;
