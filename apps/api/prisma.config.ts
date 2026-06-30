import { defineConfig, env } from "prisma/config";
import { loadEnvForCli } from "./src/config/env";

loadEnvForCli();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
