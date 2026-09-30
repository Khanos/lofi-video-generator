"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageSequence, type SequenceImage } from "@/components/ImageSequence";
import { Progress } from "@/components/Progress";
import { SettingsPanel } from "@/components/SettingsPanel";
import { VideoPreview } from "@/components/VideoPreview";
import type { VideoJob, VideoSettings } from "@/types/video";

const defaultSettings: VideoSettings = {
  fps: 24,
  multiplier: 4,
  rifeModel: "4.25",
  transitionSeconds: 1,
  loopMode: "closed",
  resolution: "original",
  crf: 16,
};

export default function Home() {
  const [images, setImages] = useState<SequenceImage[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = job
    ? ["preparing", "interpolating", "encoding"].includes(job.status)
    : false;

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (!files.length || busy) return;
      setImages((current) => [
        ...current,
        ...files.map((file) => ({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
        })),
      ]);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [busy]);

  useEffect(() => {
    if (!job || !busy) return;

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/jobs/${job.id}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { job: VideoJob };
      setJob(payload.job);
    }, 1500);

    return () => window.clearInterval(timer);
  }, [job, busy]);

  const canGenerate = useMemo(
    () => images.length >= 2 && !busy,
    [images.length, busy],
  );

  async function generate() {
    setError(null);
    const form = new FormData();
    for (const image of images) form.append("images", image.file, image.file.name);
    for (const [key, value] of Object.entries(settings)) {
      form.append(key, String(value));
    }

    const response = await fetch("/api/generate", {
      method: "POST",
      body: form,
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Generation failed");
      if (payload.job) setJob(payload.job);
      return;
    }

    setJob(payload.job);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#143044_0,#08090d_38rem)] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-end justify-between border-b border-white/10 pb-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-cyan-200">
              Local AI video tool
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              LoFi Video Generator
            </h1>
          </div>
          <p className="max-w-md text-right text-sm text-slate-400">
            Ordered images become RIFE frames, then FFmpeg encodes H.264 MP4.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <ImageSequence images={images} setImages={setImages} disabled={busy} />
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            disabled={busy}
          />
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <button
            disabled={!canGenerate}
            onClick={generate}
            className="h-14 w-full rounded-md bg-cyan-300 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-950/40 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy ? "Generating..." : "Generate Video"}
          </button>
          {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
        </div>

        <div className="mt-5 space-y-5">
          <Progress job={job} />
          <VideoPreview job={job} />
        </div>
      </div>
    </main>
  );
}
