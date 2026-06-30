import { config } from "dotenv";
import { existsSync } from "node:fs";
import { workspaceEnvFile } from "./workspace-root";

/**
 * Load the repo-root `.env` for CLI tools (Prisma, seed, tests).
 * Skipped when NODE_ENV=production — the platform must inject variables.
 */
export function loadEnvForCli(): string | undefined {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  const envPath = workspaceEnvFile();
  if (!existsSync(envPath)) {
    return undefined;
  }

  config({ path: envPath });
  return envPath;
}
