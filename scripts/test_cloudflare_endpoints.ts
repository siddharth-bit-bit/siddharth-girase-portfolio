import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const loaderUrl = pathToFileURL(path.join(__dirname, "register_json_loader.mjs")).href;
const coreTestPath = path.join(__dirname, "test_suite_core.ts");

const result = spawnSync(
  process.execPath,
  ["--import", loaderUrl, coreTestPath, ...process.argv.slice(2)],
  { stdio: "inherit" }
);

process.exit(result.status ?? 0);
