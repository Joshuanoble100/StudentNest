import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { env, isProviderConfigured } from "@/lib/env";

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export interface UploadResult {
  url: string;
  thumbUrl?: string;
  width?: number;
  height?: number;
}

export class UploadError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
  }
}

/** Validates size + MIME type before any bytes hit storage. */
export function validateImageUpload(file: File | { size: number; type: string }): void {
  const maxBytes = env.storage.maxUploadSizeMb * 1024 * 1024;
  if (file.size <= 0) throw new UploadError("File is empty");
  if (file.size > maxBytes) {
    throw new UploadError(`Image must be under ${env.storage.maxUploadSizeMb}MB`);
  }
  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new UploadError("Only JPEG, PNG, and WebP images are allowed");
  }
}

/**
 * Optional sharp-based processing: resize + compress main image and generate a
 * thumbnail. When sharp is unavailable (not installed), images are stored as
 * uploaded — the abstraction still enforces size/MIME limits.
 */
async function processImage(
  buffer: Buffer,
  mime: string,
): Promise<{ main: Buffer; thumb?: Buffer; width?: number; height?: number }> {
  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(buffer, { failOn: "error" });
    const metadata = await image.metadata();
    const main = await image
      .rotate() // normalize EXIF orientation
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .toFormat(mime === "image/png" ? "png" : "jpeg", { quality: 82 })
      .toBuffer();
    const thumb = await sharp(main)
      .resize({ width: 400, height: 400, fit: "cover" })
      .toFormat("jpeg", { quality: 70 })
      .toBuffer();
    return {
      main,
      thumb,
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    // sharp missing or image unreadable by sharp — store original bytes.
    return { main: buffer };
  }
}

interface StorageProvider {
  upload(buffer: Buffer, mime: string, folder: string, visibility: Visibility): Promise<UploadResult>;
  remove(url: string): Promise<void>;
  /** Reads back a private object's bytes. Only reachable through /api/documents (admin-gated). */
  readPrivate(objectPath: string): Promise<{ bytes: Buffer; contentType: string } | null>;
}

export type Visibility = "public" | "private";

/** Private objects live outside `public/` and are served only to admins. */
const PRIVATE_PREFIX = "/api/documents/";

class LocalStorageProvider implements StorageProvider {
  private root = path.join(process.cwd(), "public", "uploads");
  // Deliberately outside `public/` — nothing here is reachable by URL guessing.
  private privateRoot = path.join(process.cwd(), ".data", "uploads");

  async upload(buffer: Buffer, mime: string, folder: string, visibility: Visibility): Promise<UploadResult> {
    const processed = await processImage(buffer, mime);
    const id = randomUUID();
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const isPrivate = visibility === "private";
    const base = isPrivate ? this.privateRoot : this.root;
    const dir = path.join(base, folder);
    await fs.mkdir(dir, { recursive: true });

    const fileName = `${id}.${ext}`;
    await fs.writeFile(path.join(dir, fileName), processed.main);

    let thumbUrl: string | undefined;
    if (processed.thumb) {
      const thumbName = `${id}_thumb.${ext}`;
      await fs.writeFile(path.join(dir, thumbName), processed.thumb);
      thumbUrl = isPrivate ? `${PRIVATE_PREFIX}${folder}/${thumbName}` : `/uploads/${folder}/${thumbName}`;
    }
    const url = isPrivate ? `${PRIVATE_PREFIX}${folder}/${fileName}` : `/uploads/${folder}/${fileName}`;
    return { url, thumbUrl, width: processed.width, height: processed.height };
  }

  async readPrivate(objectPath: string) {
    const resolved = this.resolvePrivatePath(objectPath);
    if (!resolved) return null;
    const bytes = await fs.readFile(resolved).catch(() => null);
    if (!bytes) return null;
    return { bytes, contentType: contentTypeFor(resolved) };
  }

  private resolvePrivatePath(objectPath: string): string | null {
    const cleaned = objectPath.replace(/^\/+/, "");
    if (!cleaned || cleaned.includes("..")) return null;
    const resolved = path.resolve(path.join(this.privateRoot, cleaned));
    return resolved.startsWith(path.resolve(this.privateRoot)) ? resolved : null;
  }

  async remove(url: string): Promise<void> {
    if (url.startsWith(PRIVATE_PREFIX)) {
      const resolved = this.resolvePrivatePath(url.slice(PRIVATE_PREFIX.length));
      if (resolved) await fs.unlink(resolved).catch(() => {});
      return;
    }
    if (!url.startsWith("/uploads/")) return;
    const filePath = path.join(process.cwd(), "public", url);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(this.root))) return; // path traversal guard
    await fs.unlink(resolved).catch(() => {});
  }
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

interface SupabaseBucket {
  upload(
    path: string,
    data: Buffer,
    options: { contentType: string; upsert: boolean },
  ): Promise<{ data: { path: string } | null; error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ data: unknown; error: { message: string } | null }>;
  download(path: string): Promise<{ data: Blob | null; error: { message: string } | null }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

interface SupabaseStorageClient {
  from(bucket: string): SupabaseBucket;
}

class SupabaseStorageProvider implements StorageProvider {
  private clientPromise: Promise<{ bucket: string; storage: SupabaseStorageClient }> = import(
    "@supabase/supabase-js",
  ).then(({ createClient }) => ({
    bucket: env.storage.supabaseBucket,
    storage: createClient(
      env.storage.supabaseUrl!,
      env.storage.supabaseServiceKey!,
    ).storage as unknown as SupabaseStorageClient,
  }));

  /** Private objects go to a separate bucket that has no public read policy. */
  private bucketFor(visibility: Visibility) {
    return this.clientPromise.then(({ bucket, storage }) => ({
      bucket: visibility === "private" ? `${bucket}-private` : bucket,
      storage,
    }));
  }

  async upload(buffer: Buffer, mime: string, folder: string, visibility: Visibility): Promise<UploadResult> {
    const processed = await processImage(buffer, mime);
    const isPrivate = visibility === "private";
    const { bucket, storage } = await this.bucketFor(visibility);
    const id = randomUUID();
    const objectPath = `${folder}/${id}.jpg`;
    const res = await storage.from(bucket).upload(objectPath, processed.main, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (res.error) throw new UploadError(`Storage upload failed: ${res.error.message}`);

    let thumbUrl: string | undefined;
    if (processed.thumb) {
      const thumbPath = `${folder}/${id}_thumb.jpg`;
      await storage.from(bucket).upload(thumbPath, processed.thumb, {
        contentType: "image/jpeg",
        upsert: false,
      });
      thumbUrl = isPrivate
        ? `${PRIVATE_PREFIX}${thumbPath}`
        : storage.from(bucket).getPublicUrl(thumbPath).data.publicUrl;
    }
    return {
      url: isPrivate ? `${PRIVATE_PREFIX}${objectPath}` : storage.from(bucket).getPublicUrl(objectPath).data.publicUrl,
      thumbUrl,
      width: processed.width,
      height: processed.height,
    };
  }

  async readPrivate(objectPath: string) {
    const cleaned = objectPath.replace(/^\/+/, "");
    if (!cleaned || cleaned.includes("..")) return null;
    const { storage } = await this.clientPromise;
    const bucket = `${env.storage.supabaseBucket}-private`;
    const res = await storage.from(bucket).download(cleaned);
    if (res.error || !res.data) return null;
    return { bytes: Buffer.from(await res.data.arrayBuffer()), contentType: res.data.type || "image/jpeg" };
  }

  async remove(url: string): Promise<void> {
    const isPrivate = url.startsWith(PRIVATE_PREFIX);
    const { bucket, storage } = await this.bucketFor(isPrivate ? "private" : "public");
    if (isPrivate) {
      await storage.from(bucket).remove([url.slice(PRIVATE_PREFIX.length)]);
      return;
    }
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const objectPath = url.slice(idx + marker.length).split("?")[0]!;
    await storage.from(bucket).remove([objectPath]);
  }
}

class CloudinaryStorageProvider implements StorageProvider {
  private async signedUpload(buffer: Buffer, folder: string, transform?: string, restricted = false) {
    const timestamp = Math.floor(Date.now() / 1000);
    const { createHash } = await import("crypto");
    const params: Record<string, string | number> = {
      timestamp,
      folder: `studentnest/${folder}`,
    };
    if (transform) params.transformation = transform;
    if (restricted) params.access_mode = "authenticated";
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const signature = createHash("sha1").update(toSign + env.storage.cloudinaryApiSecret).digest("hex");

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)]), "image.jpg");
    form.append("api_key", env.storage.cloudinaryApiKey!);
    form.append("timestamp", String(timestamp));
    form.append("folder", params.folder as string);
    if (transform) form.append("transformation", transform);
    if (restricted) form.append("access_mode", "authenticated");
    form.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${env.storage.cloudinaryCloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new UploadError(`Cloudinary upload failed (${res.status})`);
    return (await res.json()) as { secure_url: string; public_id: string; width: number; height: number };
  }

  async upload(buffer: Buffer, mime: string, folder: string, visibility: Visibility): Promise<UploadResult> {
    const processed = await processImage(buffer, mime);
    const restricted = visibility === "private";
    const main = await this.signedUpload(processed.main, folder, "w_1600,c_limit,q_auto,f_auto", restricted);
    const thumb = processed.thumb
      ? await this.signedUpload(processed.thumb, folder, "w_400,h_400,c_thumb,q_auto,f_auto", restricted)
      : undefined;
    return {
      url: restricted ? `${PRIVATE_PREFIX}${main.public_id}.jpg` : main.secure_url,
      thumbUrl: restricted
        ? thumb
          ? `${PRIVATE_PREFIX}${thumb.public_id}.jpg`
          : undefined
        : thumb?.secure_url,
      width: main.width,
      height: main.height,
    };
  }

  /**
   * Authenticated assets cannot be fetched by public URL, so we pull the bytes
   * through the Cloudinary API with basic auth and proxy them to the admin.
   */
  async readPrivate(objectPath: string) {
    const publicId = objectPath.replace(/^\/+/, "").replace(/\.(jpg|jpeg|png|webp)$/i, "");
    if (!publicId || publicId.includes("..")) return null;
    const credentials = Buffer.from(
      `${env.storage.cloudinaryApiKey}:${env.storage.cloudinaryApiSecret}`,
    ).toString("base64");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${env.storage.cloudinaryCloudName}/image/upload/${publicId}`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    if (!res.ok) return null;
    return {
      bytes: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") ?? "image/jpeg",
    };
  }

  async remove(url: string): Promise<void> {
    const match = url.startsWith(PRIVATE_PREFIX)
      ? [, url.slice(PRIVATE_PREFIX.length).replace(/\.(jpg|jpeg|png|webp)$/i, "")]
      : url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    if (!match) return;
    const timestamp = Math.floor(Date.now() / 1000);
    const { createHash } = await import("crypto");
    const toSign = `public_id=${match[1]}&timestamp=${timestamp}`;
    const signature = createHash("sha1").update(toSign + env.storage.cloudinaryApiSecret).digest("hex");
    const form = new FormData();
    form.append("public_id", match[1]!);
    form.append("api_key", env.storage.cloudinaryApiKey!);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    await fetch(`https://api.cloudinary.com/v1_1/${env.storage.cloudinaryCloudName}/image/destroy`, {
      method: "POST",
      body: form,
    }).catch(() => {});
  }
}

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;
  switch (env.storage.provider) {
    case "supabase":
      if (!isProviderConfigured("storage")) {
        console.warn("[storage] Supabase credentials missing — falling back to local storage");
        break;
      }
      provider = new SupabaseStorageProvider();
      return provider;
    case "cloudinary":
      if (!isProviderConfigured("storage")) {
        console.warn("[storage] Cloudinary credentials missing — falling back to local storage");
        break;
      }
      provider = new CloudinaryStorageProvider();
      return provider;
  }
  provider = new LocalStorageProvider();
  return provider;
}

export async function uploadImage(
  file: File,
  folder: string = "properties",
  visibility: Visibility = "public",
): Promise<UploadResult> {
  validateImageUpload(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  return getStorageProvider().upload(buffer, file.type, folder, visibility);
}

export async function deleteImage(url: string): Promise<void> {
  await getStorageProvider().remove(url);
}

/**
 * Reads a private document (verification evidence). Called only from the
 * admin-gated /api/documents route — these bytes must never reach a public URL.
 */
export async function readPrivateDocument(
  objectPath: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  return getStorageProvider().readPrivate(objectPath);
}
