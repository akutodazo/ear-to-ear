import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Service（純粋関数）が主戦場。ブラウザ API に依存しないので node 環境で動かす
export default defineConfig({
  // tsconfig の paths と同じ別名。worker から @/services の値を import するため
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "worker/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
