import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface RunResult {
  stdout: string;
  stderr: string;
}

export function runProcess(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
) {
  return new Promise<RunResult>((resolve, reject) => {
    const guarded = process.platform === "linux";
    const owner = guarded ? {
      pid: process.pid,
      start: readFileSync(`/proc/${process.pid}/stat`, "utf8").split(") ").at(-1)!.split(" ")[19],
    } : null;
    const child = spawn(guarded ? process.execPath : command, guarded ? [
      path.resolve(process.cwd(), "scripts/run-owned.mjs"), JSON.stringify(owner), command, ...args,
    ] : args, {
      cwd: options.cwd,
      shell: false,
      detached: guarded,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} exited with ${code}: ${stderr || stdout}`));
    });
  });
}
