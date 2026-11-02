import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];
if (!["dev", "start"].includes(mode)) throw new Error("Expected dev or start.");
const require = createRequire(import.meta.url);
const next = require.resolve("next/dist/bin/next");
const guarded = process.platform === "linux";
const owner = guarded ? { pid: process.pid,
  start: readFileSync(`/proc/${process.pid}/stat`, "utf8").split(") ").at(-1).split(" ")[19] } : null;
const args = [next, mode, ...(mode === "start" ? ["--hostname", "127.0.0.1"] : [])];
const child = spawn(process.execPath, guarded ? [fileURLToPath(new URL("./run-owned.mjs", import.meta.url)),
  JSON.stringify(owner), process.execPath, ...args] : args, { stdio: "inherit", detached: guarded });
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => child.kill(signal));
child.once("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.once("exit", (code) => { process.exitCode = code ?? 143; });
