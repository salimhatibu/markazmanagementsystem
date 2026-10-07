import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  appType: "spa",
  plugins: [
    react(),
    // Default: fully local bindings (no Access/cloudflared). Use `npm run dev:remote` for Workers AI.
    cloudflare({
      remoteBindings: process.env.CLOUDFLARE_VITE_REMOTE === "true",
    }),
  ],
});
