import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin";

export default defineConfig({
  appType: "spa",
  plugins: [
    react(),
    netlify({
      // This app has no edge functions. The local Deno binary rejects the
      // plugin's edge-emulator flag and takes the dev server down with it.
      edgeFunctions: { enabled: false },
    }),
  ],
});
