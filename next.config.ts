import type { NextConfig } from "next";
import os from "os";

// Deteksi seluruh IP lokal (Wi-Fi, LAN) agar otomatis bisa diakses dari HP / laptop di jaringan manapun
const detectedIps: string[] = [];
try {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        detectedIps.push(net.address);
        detectedIps.push(`${net.address}:3000`);
      }
    }
  }
} catch {
  // ignore
}

const allowedOrigins = Array.from(
  new Set([
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "192.168.133.40",
    "192.168.133.40:3000",
    ...detectedIps,
  ])
);

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: allowedOrigins,
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
