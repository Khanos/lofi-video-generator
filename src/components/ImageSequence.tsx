"use client";

interface SequenceImage {
  id: string;
  file: File;
  url: string;
}

interface Props {
  images: SequenceImage[];
  setImages: (images: SequenceImage[]) => void;
  disabled?: boolean;
}

export function ImageSequence({ images, setImages, disabled }: Props) {
  const addFiles = (files: FileList | File[]) => {
    const next = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      }));
    setImages([...images, ...next]);
  };

  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setImages(next);
  };

  const remove = (id: string) => {
    const image = images.find((item) => item.id === id);
    if (image) URL.revokeObjectURL(image.url);
    setImages(images.filter((item) => item.id !== id));
  };

  const clear = () => {
    for (const image of images) URL.revokeObjectURL(image.url);
    setImages([]);
  };

  return (
    <section
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (!disabled) addFiles(event.dataTransfer.files);
      }}
      className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Image sequence
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste, drop, select, then drag thumbnails to reorder.
          </p>
        </div>
        <button
          disabled={disabled || images.length === 0}
          onClick={clear}
          className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear all
        </button>
      </div>

      <div className="grid min-h-56 grid-cols-2 gap-3 rounded-lg border border-dashed border-white/15 bg-slate-950/60 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            draggable={!disabled}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", String(index));
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const from = Number(event.dataTransfer.getData("text/plain"));
              if (!disabled && Number.isInteger(from)) move(from, index);
            }}
            className="group relative aspect-video overflow-hidden rounded-md border border-white/10 bg-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={`Frame ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs font-medium">
              {String(index + 1).padStart(2, "0")}
            </div>
            <button
              disabled={disabled}
              onClick={() => remove(image.id)}
              className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100 disabled:hidden"
            >
              Remove
            </button>
          </div>
        ))}

        <label className="flex aspect-video cursor-pointer items-center justify-center rounded-md border border-dashed border-white/20 bg-white/[0.03] text-center text-sm text-slate-400 hover:bg-white/[0.06]">
          <input
            disabled={disabled}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
          Paste / Drop / Select
        </label>
      </div>
    </section>
  );
}

export type { SequenceImage };
