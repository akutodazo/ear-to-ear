import { defineConfig } from "vitest/config";

// Service（純粋関数）が主戦場。ブラウザ API に依存しないので node 環境で動かす
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "worker/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
