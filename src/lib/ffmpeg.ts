import { stat } from "node:fs/promises";
import path from "node:path";
import "./env";
import { runProcess } from "./process";
import { normalizedFrameName } from "./sequence";
import type { Resolution, VideoSettings } from "../types/video";

export interface Dimensions {
  width: number;
  height: number;
}

export function ffmpegBin() {
  return process.env.FFMPEG_BIN || "ffmpeg";
}

export function ffprobeBin() {
  if (process.env.FFPROBE_BIN) return process.env.FFPROBE_BIN;
  const ffmpeg = ffmpegBin();
  return ffmpeg.includes("/") ? path.join(path.dirname(ffmpeg), "ffprobe") : "ffprobe";
}

export async function assertFfmpeg() {
  await runProcess(ffmpegBin(), ["-version"]);
  await runProcess(ffprobeBin(), ["-version"]);
}

export function buildNormalizeArgs(
  source: string,
  target: string,
  dimensions: Dimensions,
) {
  const filter = [
    `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease`,
    `pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2`,
    "format=rgba",
  ].join(",");

  return ["-y", "-i", source, "-vf", filter, "-frames:v", "1", target];
}

export function buildEncodeArgs(
  inputDir: string,
  outputPath: string,
  settings: Pick<VideoSettings, "fps" | "crf" | "multiplier" | "transitionSeconds">,
) {
  const inputFps = settings.multiplier / settings.transitionSeconds;

  return [
    "-y",
    "-framerate",
    String(inputFps),
    "-i",
    path.join(inputDir, "%06d.png"),
    "-vf",
    `fps=${settings.fps}`,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    String(settings.crf),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export async function ffprobeDimensions(source: string): Promise<Dimensions> {
  const result = await runProcess(ffprobeBin(), [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=s=x:p=0",
    source,
  ]);
  const [width, height] = result.stdout.trim().split("x").map(Number);
  if (!width || !height) {
    throw new Error("Could not read source image dimensions");
  }
  return { width, height };
}

export function dimensionsForResolution(
  resolution: Resolution,
  original: Dimensions,
): Dimensions {
  if (resolution === "1920x1080") return { width: 1920, height: 1080 };
  if (resolution === "1280x720") return { width: 1280, height: 720 };
  return original;
}

export async function normalizeImages(
  uploads: string[],
  inputDir: string,
  resolution: Resolution,
) {
  const first = await ffprobeDimensions(uploads[0]);
  const dimensions = dimensionsForResolution(resolution, first);

  for (const [index, source] of uploads.entries()) {
    const target = path.join(inputDir, normalizedFrameName(index));
    await runProcess(ffmpegBin(), buildNormalizeArgs(source, target, dimensions));
  }
}

export async function encodeMp4(
  inputDir: string,
  outputPath: string,
  settings: Pick<
    VideoSettings,
    "fps" | "crf" | "multiplier" | "transitionSeconds"
  >,
) {
  await runProcess(ffmpegBin(), buildEncodeArgs(inputDir, outputPath, settings));
  await stat(outputPath);
}
