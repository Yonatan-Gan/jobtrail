import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/ and https://vitest.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // The same time zone on every machine (CI runs in UTC), so date tests are stable.
    env: { TZ: "UTC" },
  },
});
