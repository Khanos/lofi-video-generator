import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const workspaceBase = path.join(tmpdir(), "lofi-video");

export interface JobWorkspace {
  root: string;
  uploadsDir: string;
  inputDir: string;
  interpolatedDir: string;
  outputPath: string;
}

export async function cleanWorkspaceBase() {
  await rm(workspaceBase, { recursive: true, force: true });
  await mkdir(workspaceBase, { recursive: true });
}

export async function createJobWorkspace(jobId: string): Promise<JobWorkspace> {
  await mkdir(workspaceBase, { recursive: true });
  const root = await mkdtemp(path.join(workspaceBase, `${jobId}-`));
  const uploadsDir = path.join(root, "uploads");
  const inputDir = path.join(root, "input");
  const interpolatedDir = path.join(root, "interpolated");
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(inputDir, { recursive: true });
  await mkdir(interpolatedDir, { recursive: true });

  return {
    root,
    uploadsDir,
    inputDir,
    interpolatedDir,
    outputPath: path.join(root, "output.mp4"),
  };
}

export async function saveUpload(directory: string, index: number, file: File) {
  const extension = file.type === "image/jpeg" ? "jpg" : "png";
  const target = path.join(
    directory,
    `${index.toString().padStart(6, "0")}.${extension}`,
  );
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return target;
}
