import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/international-lawn-cricket" : "",
  assetPrefix: isProd ? "/international-lawn-cricket/" : "",
  turbopack: {},
};

export default withPWA(nextConfig);
