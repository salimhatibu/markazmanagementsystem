import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin";

const IDENTITY_SITE = "https://markazimamshafii.netlify.app";

const identityProxy = {
  target: IDENTITY_SITE,
  changeOrigin: true,
  secure: true,
};

export default defineConfig({
  appType: "spa",
  plugins: [
    react(),
    netlify({
      // Deno's local edge emulator rejects --allow-scripts and kills the Vite server.
      edgeFunctions: { enabled: false },
    }),
  ],
  server: {
    proxy: {
      "/.netlify/identity": identityProxy,
    },
  },
  preview: {
    proxy: {
      "/.netlify/identity": identityProxy,
    },
  },
});
