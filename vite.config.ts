import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin";

export default defineConfig({
  appType: "spa",
  plugins: [
    react(),
    netlify({
      // Deno's local edge emulator rejects --allow-scripts and kills the Vite server.
      edgeFunctions: { enabled: false },
    }),
  ],
});
