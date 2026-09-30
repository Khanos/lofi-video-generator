"use client";

import type { VideoJob } from "@/types/video";

export function VideoPreview({ job }: { job: VideoJob | null }) {
  if (job?.status !== "completed") return null;

  const videoUrl = `/api/jobs/${job.id}/video`;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
          Video preview
        </h2>
        <a
          href={videoUrl}
          download={`lofi-${job.id}.mp4`}
          className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
        >
          Download MP4
        </a>
      </div>
      <video
        src={videoUrl}
        controls
        className="aspect-video w-full rounded-md bg-black"
      />
    </section>
  );
}
