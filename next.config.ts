import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: rootDir,
};

export default nextConfig;
