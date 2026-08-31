import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs & jspdf need to run on the server (they use Node APIs).
  serverExternalPackages: ["exceljs", "jspdf"],
};

export default nextConfig;
