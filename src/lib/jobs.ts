import crypto from "node:crypto";
import { rm } from "node:fs/promises";
import { assertFfmpeg, encodeMp4, normalizeImages } from "./ffmpeg";
import { assertRifeReady, RifeInterpolationEngine } from "./rife";
import {
  cleanWorkspaceBase,
  createJobWorkspace,
  saveUpload,
} from "./workspace";
import type { VideoJob, VideoSettings } from "../types/video";

const jobs = new Map<string, VideoJob>();
let runningJobId: string | null = null;
let initialized = false;

export function getJob(id: string) {
  return jobs.get(id);
}

export function isBusy() {
  return runningJobId !== null;
}

function updateJob(id: string, patch: Partial<VideoJob>) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...patch });
}

async function initWorkspaces() {
  if (initialized) return;
  initialized = true;
  await cleanWorkspaceBase();
}

export async function startGeneration(files: File[], settings: VideoSettings) {
  await initWorkspaces();

  if (runningJobId) {
    return { busy: true as const, job: jobs.get(runningJobId) };
  }

  if (files.length < 2) {
    throw new Error("Add at least 2 images");
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are supported");
    }
  }

  const id = crypto.randomUUID();
  const job: VideoJob = {
    id,
    status: "preparing",
    progress: 0.05,
    message: "Preparing images",
    createdAt: Date.now(),
  };
  jobs.clear();
  jobs.set(id, job);
  runningJobId = id;

  void runGeneration(id, files, settings);

  return { busy: false as const, job };
}

async function runGeneration(id: string, files: File[], settings: VideoSettings) {
  let workspaceRoot: string | null = null;

  try {
    updateJob(id, {
      status: "preparing",
      progress: 0.1,
      message: "Checking tools",
    });
    await assertFfmpeg();
    await assertRifeReady(settings.rifeModel);

    const workspace = await createJobWorkspace(id);
    workspaceRoot = workspace.root;

    const uploads: string[] = [];
    for (const [index, file] of files.entries()) {
      uploads.push(await saveUpload(workspace.uploadsDir, index, file));
    }

    updateJob(id, {
      status: "preparing",
      progress: 0.25,
      message: "Normalizing images",
    });
    await normalizeImages(uploads, workspace.inputDir, settings.resolution);

    updateJob(id, {
      status: "interpolating",
      progress: 0.5,
      message: "Interpolating with RIFE",
    });
    await new RifeInterpolationEngine().interpolate({
      inputDir: workspace.inputDir,
      outputDir: workspace.interpolatedDir,
      sourceCount: files.length,
      multiplier: settings.multiplier,
      loopMode: settings.loopMode,
      rifeModel: settings.rifeModel,
    });

    updateJob(id, {
      status: "encoding",
      progress: 0.8,
      message: "Encoding MP4",
    });
    await encodeMp4(workspace.interpolatedDir, workspace.outputPath, settings);

    updateJob(id, {
      status: "completed",
      progress: 1,
      message: "Complete",
      outputPath: workspace.outputPath,
    });
  } catch (error) {
    console.error(error);
    updateJob(id, {
      status: "failed",
      progress: 1,
      message: "Failed",
      error: error instanceof Error ? error.message.slice(0, 1200) : String(error),
    });
    if (workspaceRoot) {
      await rm(workspaceRoot, { recursive: true, force: true }).catch(() => {});
    }
  } finally {
    runningJobId = null;
  }
}
