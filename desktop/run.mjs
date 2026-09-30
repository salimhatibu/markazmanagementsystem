import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const dist = process.argv.includes("--dist");

if (!existsSync(join(dir, "node_modules", "electron"))) {
  const install = spawnSync("npm", ["install"], { cwd: dir, stdio: "inherit", shell: true });
  if (install.status) process.exit(install.status ?? 1);
}

const result = spawnSync("npm", ["run", dist ? "dist" : "start"], {
  cwd: dir,
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
