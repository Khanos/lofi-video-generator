import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { runProcess } from "../src/lib/process";

const alive = (pid: number) => {
  try { return !readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1].startsWith("Z"); }
  catch { return false; }
};
async function until(check: () => boolean, attempts = 100) {
  for (let i = 0; i < attempts; i++) { if (check()) return; await delay(100); }
  assert.fail("Owned worker did not reach the expected state");
}

test("guarded commands retain output, arguments, cwd and failures", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "video-output-"));
  try {
    const result = await runProcess(process.execPath, ["-e", "console.log(process.argv[1]);console.error(process.cwd())", "literal; $value"], { cwd: dir });
    assert.equal(result.stdout.trim(), "literal; $value");
    assert.equal(result.stderr.trim(), dir);
    await assert.rejects(runProcess(process.execPath, ["-e", "process.exit(7)"]), /exited with 7/);
    await assert.rejects(runProcess(path.join(dir, "missing-command"), []), /exited with 1/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

for (const [loseAncestor, ignoreTerm] of [[false, false], [true, false], [false, true]]) {
  test(`worker cleanup detects ${loseAncestor ? "outer launcher" : "server"} death${ignoreTerm ? " and force-stops a stubborn worker" : " without a shutdown signal"}`, { timeout: 30000 }, async (t) => {
    const dir = mkdtempSync(path.join(tmpdir(), "video-owner-"));
    const events = path.join(dir, "events.json");
    const worker = path.join(dir, "worker.cjs");
    writeFileSync(worker, `
      const {spawn}=require('node:child_process');
      const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
      ${ignoreTerm ? "process.on('SIGTERM',()=>{});" : ""}
      require('node:fs').writeFileSync(${JSON.stringify(events)},JSON.stringify({worker:process.pid,descendant:child.pid,owner:process.ppid}));
      setInterval(()=>{},1000);
    `);
    const script = `import {runProcess} from ${JSON.stringify(new URL("../src/lib/process.ts", import.meta.url).href)};
      await runProcess(process.execPath,[${JSON.stringify(worker)}]);`;
    const owner = spawn(process.execPath, loseAncestor ? ["-e", `
      require('node:child_process').spawn(process.execPath,['--import','tsx','--input-type=module','-e',${JSON.stringify(script)}],{stdio:'ignore'});
      setInterval(()=>{},1000);
    `] : ["--import", "tsx", "--input-type=module", "-e", script], { cwd: process.cwd(), stdio: "ignore" });
    const ownerExited = new Promise((resolve) => owner.once("exit", resolve));
    const unrelated = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], { stdio: "ignore" });
    const unrelatedExited = new Promise((resolve) => unrelated.once("exit", resolve));
    let pids: number[] = [];
    t.after(async () => {
      owner.kill("SIGKILL");
      await ownerExited;
      unrelated.kill("SIGTERM"); await unrelatedExited;
      for (const pid of pids) { if (alive(pid)) { try { process.kill(pid, "SIGKILL"); } catch {} } }
      rmSync(dir, { recursive: true, force: true });
    });
    await until(() => { try { const d = JSON.parse(readFileSync(events, "utf8")); pids = [d.worker, d.descendant, d.owner]; return true; } catch { return false; } });
    owner.kill("SIGKILL");
    await ownerExited;
    await until(() => pids.every((pid) => !alive(pid)), ignoreTerm ? 250 : 100);
    assert.equal(alive(unrelated.pid!), true, "unrelated processes must remain untouched");
  });
}

for (const signal of ["SIGINT", "SIGKILL"] as const) {
  test(`video launcher cleans its server group after ${signal}`, { timeout: 15000 }, async (t) => {
    const root = mkdtempSync(path.join(tmpdir(), "video-web-owner-"));
    mkdirSync(path.join(root, "scripts"));
    for (const name of ["web-start.mjs", "run-owned.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), path.join(root, "scripts", name));
    }
    const bin = path.join(root, "node_modules/next/dist/bin");
    mkdirSync(bin, { recursive: true });
    const events = path.join(root, "events");
    writeFileSync(path.join(bin, "next"), `
      const child=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
      require('node:fs').writeFileSync(${JSON.stringify(events)},JSON.stringify({pids:[process.pid,child.pid],args:process.argv.slice(2)}));
      setInterval(()=>{},1000);
    `);
    const launcher = spawn(process.execPath, [path.join(root, "scripts/web-start.mjs"), "start"], { cwd: root, stdio: "ignore" });
    const exited = new Promise(resolve => launcher.once("exit", resolve));
    let pids: number[] = [];
    t.after(async () => {
      launcher.kill("SIGKILL"); await exited;
      for (const pid of pids) if (alive(pid)) { try { process.kill(pid, "SIGKILL"); } catch {} }
      rmSync(root, { recursive: true, force: true });
    });
    await until(() => {
      try {
        const data = JSON.parse(readFileSync(events, "utf8"));
        pids = data.pids;
        assert.deepEqual(data.args, ["start", "--hostname", "127.0.0.1"]);
        return true;
      } catch { return false; }
    });
    launcher.kill(signal); await exited;
    await until(() => pids.every((pid) => !alive(pid)));
  });
}
