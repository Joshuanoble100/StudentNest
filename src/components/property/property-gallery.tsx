"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  url: string;
  thumbUrl: string | null;
  alt: string | null;
}

interface PropertyGalleryProps {
  images: GalleryImage[];
  title: string;
}

/** Photo gallery with keyboard navigation and a thumbnail strip. */
export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-slate-400">
        <div className="text-center">
          <ImageIcon className="mx-auto h-10 w-10" aria-hidden />
          <p className="mt-2 text-sm">No photos uploaded yet</p>
        </div>
      </div>
    );
  }

  const current = images[index]!;
  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div>
      <div
        className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 sm:aspect-[16/10]"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(1);
          if (event.key === "ArrowLeft") go(-1);
        }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${title} photos`}
      >
        <Image
          src={current.url}
          alt={current.alt ?? `${title} — photo ${index + 1} of ${images.length}`}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Photo thumbnails">
          {images.map((image, i) => (
            <button
              key={`${image.url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === index ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={image.thumbUrl ?? image.url}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
