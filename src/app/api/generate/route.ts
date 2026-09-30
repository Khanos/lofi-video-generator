import { NextResponse } from "next/server";
import { startGeneration } from "@/lib/jobs";
import type {
  LoopMode,
  Resolution,
  RifeMultiplier,
  VideoSettings,
} from "@/types/video";

export const runtime = "nodejs";

function parseSettings(form: FormData): VideoSettings {
  const fps = Number(form.get("fps") || 24);
  const multiplier = Number(form.get("multiplier") || 4) as RifeMultiplier;
  const transitionSeconds = Number(form.get("transitionSeconds") || 1);
  const crf = Number(form.get("crf") || 16);

  return {
    fps: fps === 30 || fps === 60 ? fps : 24,
    multiplier: multiplier === 2 || multiplier === 8 ? multiplier : 4,
    rifeModel: String(form.get("rifeModel") || "4.25"),
    transitionSeconds: Math.min(5, Math.max(0.25, transitionSeconds)),
    loopMode: (form.get("loopMode") || "closed") as LoopMode,
    resolution: (form.get("resolution") || "original") as Resolution,
    crf: Math.min(30, Math.max(0, crf)),
  };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form
      .getAll("images")
      .filter((value): value is File => value instanceof File);

    const result = await startGeneration(files, parseSettings(form));

    if (result.busy) {
      return NextResponse.json(
        { error: "Another job is running", job: result.job },
        { status: 409 },
      );
    }

    return NextResponse.json({ job: result.job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
