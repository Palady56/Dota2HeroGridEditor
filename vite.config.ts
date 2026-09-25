import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Project Pages live at /Dota2HeroGridEditor/; local `npm run dev` stays at /.
  base: process.env.GITHUB_ACTIONS ? "/Dota2HeroGridEditor/" : "/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
