"use client";

import type { VideoSettings } from "@/types/video";

interface Props {
  settings: VideoSettings;
  onChange: (settings: VideoSettings) => void;
  disabled?: boolean;
}

export function SettingsPanel({ settings, onChange, disabled }: Props) {
  const set = <K extends keyof VideoSettings>(key: K, value: VideoSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
          Settings
        </h2>
        <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">
          Local
        </span>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">Output FPS</span>
          <select
            disabled={disabled}
            value={settings.fps}
            onChange={(event) => set("fps", Number(event.target.value) as 24 | 30 | 60)}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value={24}>24</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">RIFE multiplier</span>
          <select
            disabled={disabled}
            value={settings.multiplier}
            onChange={(event) => set("multiplier", Number(event.target.value) as 2 | 4 | 8)}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value={2}>2x</option>
            <option value={4}>4x</option>
            <option value={8}>8x</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">RIFE model</span>
          <input
            disabled={disabled}
            value={settings.rifeModel}
            onChange={(event) => set("rifeModel", event.target.value)}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">
            Transition duration
          </span>
          <input
            disabled={disabled}
            type="number"
            min={0.25}
            max={5}
            step={0.25}
            value={settings.transitionSeconds}
            onChange={(event) =>
              set("transitionSeconds", Number(event.target.value))
            }
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">Loop</span>
          <select
            disabled={disabled}
            value={settings.loopMode}
            onChange={(event) =>
              set("loopMode", event.target.value as VideoSettings["loopMode"])
            }
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="none">None</option>
            <option value="closed">Closed loop</option>
            <option value="pingpong">Ping-pong</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">Resolution</span>
          <select
            disabled={disabled}
            value={settings.resolution}
            onChange={(event) =>
              set("resolution", event.target.value as VideoSettings["resolution"])
            }
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="original">Original</option>
            <option value="1920x1080">1920x1080</option>
            <option value="1280x720">1280x720</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">CRF</span>
          <input
            disabled={disabled}
            type="number"
            min={0}
            max={30}
            value={settings.crf}
            onChange={(event) => set("crf", Number(event.target.value))}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </aside>
  );
}
