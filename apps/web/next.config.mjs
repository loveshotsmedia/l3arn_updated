/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [];
  },
  // Route groups (parent)/(student)/(admin) are stripped from the URL by Next, but
  // the app's links and router.push() calls use /parent/*, /student/*, /admin/*
  // prefixes. Without these rewrites every cross-page navigation 404s (e.g. login →
  // /parent/dashboard). Map the prefixed URLs onto the group-stripped pages so the
  // app's own navigation resolves in both `next dev` and on Vercel. (Agent 17, 2026-06-28)
  async rewrites() {
    return [
      { source: "/parent/:path*", destination: "/:path*" },
      { source: "/student/:path*", destination: "/:path*" },
      { source: "/admin/:path*", destination: "/:path*" },
    ];
  },
};

export default nextConfig;
