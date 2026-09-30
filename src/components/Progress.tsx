"use client";

import type { VideoJob } from "@/types/video";

export function Progress({ job }: { job: VideoJob | null }) {
  if (!job) return null;

  const percent = Math.round((job.progress ?? 0) * 100);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-200">{job.message || job.status}</span>
        <span className="text-slate-400">{percent}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-950">
        <div
          className="h-full bg-cyan-300 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {job.error ? (
        <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-red-950/40 p-3 text-xs text-red-100">
          {job.error}
        </pre>
      ) : null}
    </section>
  );
}
