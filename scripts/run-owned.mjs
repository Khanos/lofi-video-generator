// Keep cleanup outside Next so a server crash cannot orphan GPU workers.
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

function identity(pid) {
  try {
    const fields = readFileSync(`/proc/${pid}/stat`, "utf8").split(") ").at(-1).split(" ");
    if (fields[0] === "Z") return null;
    return { pid, parent: Number(fields[1]), group: Number(fields[2]), start: fields[19] };
  } catch { return null; }
}
const matches = (record) => record && typeof record.start === "string" && identity(record.pid)?.start === record.start;
const [ownerText, command, ...args] = process.argv.slice(2);
const owner = JSON.parse(ownerText);
if (!Number.isInteger(owner.pid) || owner.pid <= 1 || !command || !matches(owner)) {
  console.error("Video worker owner has exited; refusing to start.");
  process.exit(1);
}
const owners = [owner];
const seen = new Set([owner.pid]);
let parent = identity(owner.pid)?.parent;
while (parent > 1 && !seen.has(parent)) {
  seen.add(parent);
  const record = identity(parent);
  if (!record) break;
  owners.push(record);
  parent = record.parent;
}

const child = spawn(command, args, { stdio: "inherit", detached: true });
const leader = identity(child.pid);
let stoppingAt = 0;
let exitCode = 1;
function members() {
  if (!leader) return [];
  const current = identity(leader.pid);
  if (current && current.start !== leader.start) return [];
  return readdirSync("/proc").filter((name) => /^\d+$/.test(name))
    .map((name) => identity(Number(name))).filter((record) => record?.group === leader.group);
}
function signalMembers(signal) {
  for (const member of members()) {
    if (!matches(member)) continue;
    try { process.kill(member.pid, signal); }
    catch (error) { if (error.code !== "ESRCH") throw error; }
  }
}
function stop(code = 143) {
  if (stoppingAt) return;
  exitCode = code;
  stoppingAt = Date.now();
  signalMembers("SIGTERM");
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => stop());
child.once("error", (error) => { console.error(error.message); stop(1); });
child.once("exit", (code) => stop(code ?? 143));
const timer = setInterval(() => {
  if (!stoppingAt && !owners.every(matches)) stop();
  if (!stoppingAt) return;
  if (members().length === 0) {
    clearInterval(timer);
    process.exitCode = exitCode;
  } else if (Date.now() - stoppingAt >= 20000) {
    signalMembers("SIGKILL");
  }
}, 100);
