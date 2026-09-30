export type JobStatus =
  | "preparing"
  | "interpolating"
  | "encoding"
  | "completed"
  | "failed";

export type LoopMode = "none" | "closed" | "pingpong";
export type OutputFps = 24 | 30 | 60;
export type RifeMultiplier = 2 | 4 | 8;
export type Resolution = "original" | "1920x1080" | "1280x720";

export interface VideoSettings {
  fps: OutputFps;
  multiplier: RifeMultiplier;
  rifeModel: string;
  transitionSeconds: number;
  loopMode: LoopMode;
  resolution: Resolution;
  crf: number;
}

export interface VideoJob {
  id: string;
  status: JobStatus;
  progress?: number;
  message?: string;
  outputPath?: string;
  error?: string;
  createdAt: number;
}
