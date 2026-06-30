import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const WORKSPACE_MARKER = "pnpm-workspace.yaml";

/**
 * Walk up from `startDir` until the monorepo root (pnpm-workspace.yaml) is found.
 */
export function findWorkspaceRoot(startDir = process.cwd()): string {
  let dir = resolve(startDir);

  while (true) {
    if (existsSync(resolve(dir, WORKSPACE_MARKER))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Monorepo root not found — expected ${WORKSPACE_MARKER} in an ancestor of ${startDir}`
      );
    }
    dir = parent;
  }
}

export function workspaceEnvFile(startDir?: string): string {
  return resolve(findWorkspaceRoot(startDir), ".env");
}
