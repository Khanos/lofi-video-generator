import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import "./env";
import { runProcess } from "./process";
import {
  buildLoopSequence,
  expForMultiplier,
  normalizedFrameName,
} from "./sequence";
import type { RifeMultiplier } from "../types/video";

export interface InterpolationOptions {
  inputDir: string;
  outputDir: string;
  sourceCount: number;
  multiplier: RifeMultiplier;
  loopMode: "none" | "closed" | "pingpong";
  rifeModel: string;
}

export interface InterpolationEngine {
  interpolate(options: InterpolationOptions): Promise<void>;
}

export function rifePath() {
  return process.env.RIFE_PATH || "/home/epi/AI/Practical-RIFE";
}

export function pythonBin() {
  return process.env.PYTHON_BIN || path.join(rifePath(), ".venv/bin/python");
}

export function modelPath(model: string) {
  if (process.env.RIFE_MODEL_DIR) return process.env.RIFE_MODEL_DIR;
  if (model.includes("/") || model.startsWith(".")) {
    return path.isAbsolute(model) ? model : path.join(rifePath(), model);
  }
  return path.join(rifePath(), "train_log");
}

export function buildRifeImageArgs(options: {
  firstImage: string;
  secondImage: string;
  multiplier: RifeMultiplier;
  model: string;
}) {
  return [
    path.join(rifePath(), "inference_img.py"),
    "--img",
    options.firstImage,
    options.secondImage,
    "--exp",
    String(expForMultiplier(options.multiplier)),
    "--model",
    modelPath(options.model),
  ];
}

async function assertFileExists(filePath: string, label: string) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

export async function assertRifeReady(model: string) {
  await assertFileExists(rifePath(), "RIFE path");
  await assertFileExists(pythonBin(), "Python executable");
  await assertFileExists(path.join(rifePath(), "inference_img.py"), "RIFE script");
  await assertFileExists(modelPath(model), "RIFE model directory");
  await runProcess(pythonBin(), ["--version"]);
}

async function sortedOutputFrames(directory: string) {
  const files = await readdir(directory);
  return files
    .filter((file) => file.endsWith(".png"))
    .sort((a, b) => {
      const aNum = Number(a.replace(/\D/g, ""));
      const bNum = Number(b.replace(/\D/g, ""));
      return aNum - bNum;
    });
}

export class RifeInterpolationEngine implements InterpolationEngine {
  async interpolate(options: InterpolationOptions) {
    await rm(options.outputDir, { recursive: true, force: true });
    await mkdir(options.outputDir, { recursive: true });

    const sequence = buildLoopSequence(options.sourceCount, options.loopMode);
    let outputIndex = 0;

    for (let index = 0; index < sequence.length - 1; index += 1) {
      const firstImage = path.join(
        options.inputDir,
        normalizedFrameName(sequence[index]),
      );
      const secondImage = path.join(
        options.inputDir,
        normalizedFrameName(sequence[index + 1]),
      );
      const pairDir = path.join(options.outputDir, `.pair-${index}`);
      await mkdir(pairDir, { recursive: true });

      await runProcess(
        pythonBin(),
        buildRifeImageArgs({
          firstImage,
          secondImage,
          multiplier: options.multiplier,
          model: options.rifeModel,
        }),
        { cwd: pairDir },
      );

      const pairOutput = path.join(pairDir, "output");
      const frames = await sortedOutputFrames(pairOutput);
      const usable = index === sequence.length - 2 ? frames : frames.slice(0, -1);

      for (const frame of usable) {
        await cp(
          path.join(pairOutput, frame),
          path.join(options.outputDir, normalizedFrameName(outputIndex)),
        );
        outputIndex += 1;
      }
    }
  }
}
