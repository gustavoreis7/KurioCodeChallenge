import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [tailwindcss(), tanstackStart(), react()],
  optimizeDeps: {
    include: [
      "axios",
      "@radix-ui/react-dialog",
      "socket.io-client",
      "engine.io-client",
      "vaul",
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    watch: {
      ignored: [
        "**/test-results/**",
        "**/playwright-report/**",
        "**/reports/**",
        "**/.vercel/**",
      ],
    },
  },
});
