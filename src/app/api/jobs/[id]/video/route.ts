import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = getJob(id);

  if (!job?.outputPath || job.status !== "completed") {
    return NextResponse.json({ error: "Video not ready" }, { status: 404 });
  }

  const video = await readFile(job.outputPath);

  return new Response(video, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(video.byteLength),
      "Content-Disposition": `inline; filename="lofi-${id}.mp4"`,
    },
  });
}
