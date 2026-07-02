const { execSync } = require("node:child_process");
const path = require("node:path");
const { config: loadEnv } = require("dotenv");

const root = path.resolve(__dirname, "..");
loadEnv({ path: path.join(root, ".env") });

module.exports = async function globalSetup() {
  if (process.env.SKIP_E2E_SEED === "1") return;

  execSync("pnpm db:seed", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
};
