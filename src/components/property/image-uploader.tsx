"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImageIcon, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ImageMeta {
  id?: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  thumbUrl: string | null;
  sortOrder: number;
  isCover: boolean;
}

const MAX_IMAGES = 20;

interface ImageUploaderProps {
  value: ImageMeta[];
  onChange: (next: ImageMeta[]) => void;
  id?: string;
}

/**
 * Listing photos. The first image marked as cover is used on cards; every image
 * needs alt text so the listing is usable with a screen reader.
 */
export function ImageUploader({ value, onChange, id = "images" }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - value.length;
    if (room <= 0) {
      toast.error(`You can add up to ${MAX_IMAGES} photos`);
      return;
    }
    const batch = Array.from(files).slice(0, room);
    setUploading(true);
    try {
      const added: ImageMeta[] = [];
      for (const file of batch) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", "properties");
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error?.message ?? `Could not upload ${file.name}`);
          continue;
        }
        added.push({
          url: json.data.url,
          alt: null,
          width: json.data.width ?? null,
          height: json.data.height ?? null,
          thumbUrl: json.data.thumbUrl ?? null,
          sortOrder: value.length + added.length,
          isCover: value.length + added.length === 0,
        });
      }
      if (added.length > 0) onChange([...value, ...added]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(index: number) {
    const next = value.filter((_, i) => i !== index).map((img, i) => ({ ...img, sortOrder: i }));
    if (next.length > 0 && !next.some((img) => img.isCover)) {
      next[0] = { ...next[0], isCover: true };
    }
    onChange(next);
  }

  function setCover(index: number) {
    onChange(value.map((img, i) => ({ ...img, isCover: i === index, sortOrder: i })));
  }

  function setAlt(index: number, alt: string) {
    onChange(value.map((img, i) => (i === index ? { ...img, alt: alt.trim() || null } : img)));
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => upload(e.target.files)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || value.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
        >
          <Upload aria-hidden /> {uploading ? "Uploading…" : "Add photos"}
        </Button>
        <span className="text-xs text-slate-500">
          {value.length}/{MAX_IMAGES} · JPEG, PNG or WebP
        </span>
      </div>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          <ImageIcon className="mx-auto mb-2 h-6 w-6" aria-hidden />
          Add at least one real photo of the property. Stock images, renders of a
          different building, or photos you do not have permission to use will get
          the listing rejected.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((img, index) => (
            <li key={`${img.url}-${index}`} className="rounded-lg border border-slate-200 p-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
                <Image
                  src={img.thumbUrl ?? img.url}
                  alt={img.alt ?? "Listing photo"}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
                {img.isCover && (
                  <span className="absolute left-2 top-2 rounded bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">
                    Cover
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-2">
                <Input
                  value={img.alt ?? ""}
                  maxLength={200}
                  placeholder="Describe this photo (e.g. “Room facing the compound”)"
                  aria-label={`Description for photo ${index + 1}`}
                  onChange={(e) => setAlt(index, e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={img.isCover ? "default" : "ghost"}
                    disabled={img.isCover}
                    onClick={() => setCover(index)}
                  >
                    <Star aria-hidden /> Cover
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn("text-red-600 hover:bg-red-50 hover:text-red-700")}
                    onClick={() => remove(index)}
                  >
                    <Trash2 aria-hidden /> Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Label htmlFor={id} className="sr-only">
        Listing photos
      </Label>
    </div>
  );
}
