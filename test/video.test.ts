import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildEncodeArgs } from "../src/lib/ffmpeg";
import { buildRifeImageArgs } from "../src/lib/rife";
import {
  buildLoopSequence,
  expForMultiplier,
  normalizedFrameName,
} from "../src/lib/sequence";

test("normalized frame names preserve visible order", () => {
  assert.equal(normalizedFrameName(0), "000000.png");
  assert.equal(normalizedFrameName(12), "000012.png");
});

test("loop modes generate expected keyframe order", () => {
  assert.deepEqual(buildLoopSequence(3, "none"), [0, 1, 2]);
  assert.deepEqual(buildLoopSequence(3, "closed"), [0, 1, 2, 0]);
  assert.deepEqual(buildLoopSequence(4, "pingpong"), [0, 1, 2, 3, 2, 1, 0]);
});

test("RIFE command uses image interpolation script and multiplier exponent", () => {
  process.env.RIFE_PATH = "/tmp/rife";
  process.env.RIFE_MODEL_DIR = "/tmp/rife/train_log";

  assert.equal(expForMultiplier(4), 2);
  assert.deepEqual(
    buildRifeImageArgs({
      firstImage: "/tmp/in/000000.png",
      secondImage: "/tmp/in/000001.png",
      multiplier: 4,
      model: "4.25",
    }),
    [
      "/tmp/rife/inference_img.py",
      "--img",
      "/tmp/in/000000.png",
      "/tmp/in/000001.png",
      "--exp",
      "2",
      "--model",
      "/tmp/rife/train_log",
    ],
  );
});

test("FFmpeg encode command applies transition timing and creates H.264 MP4", () => {
  assert.deepEqual(buildEncodeArgs("/tmp/frames", "/tmp/out.mp4", {
    fps: 24,
    crf: 16,
    multiplier: 4,
    transitionSeconds: 1,
  }), [
    "-y",
    "-framerate",
    "4",
    "-i",
    "/tmp/frames/%06d.png",
    "-vf",
    "fps=24",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "16",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "/tmp/out.mp4",
  ]);
});

test("tool paths load from env file when shell env is absent", async () => {
  const fixtureDir = path.join(process.cwd(), ".env.test-fixture");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(
    path.join(fixtureDir, ".env.local"),
    [
      "RIFE_PATH=/tmp/env-rife",
      "PYTHON_BIN=/tmp/env-python",
      "FFMPEG_BIN=/tmp/env-ffmpeg",
      "",
    ].join("\n"),
  );

  const script = [
    "(async () => {",
    "delete process.env.RIFE_PATH;",
    "delete process.env.PYTHON_BIN;",
    "delete process.env.FFMPEG_BIN;",
    `process.chdir(${JSON.stringify(fixtureDir)});`,
    "const { rifePath, pythonBin } = await import('./src/lib/rife.ts');",
    "const { ffmpegBin } = await import('./src/lib/ffmpeg.ts');",
    "console.log([rifePath(), pythonBin(), ffmpegBin()].join('|'));",
    "})();",
  ].join("");

  const { execFileSync } = await import("node:child_process");
  const childEnv = { ...process.env };
  delete childEnv.RIFE_PATH;
  delete childEnv.PYTHON_BIN;
  delete childEnv.FFMPEG_BIN;
  delete childEnv.__NEXT_PROCESSED_ENV;

  const output = execFileSync("npx", ["tsx", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: childEnv,
  }).trim();

  assert.equal(output, "/tmp/env-rife|/tmp/env-python|/tmp/env-ffmpeg");
});
