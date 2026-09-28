import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * tsx does not load .env automatically, and Prisma only reads DATABASE_URL at
 * client construction time — so parse .env before anything else runs.
 */
export function loadDotEnv(): void {
  const file = path.join(process.cwd(), ".env");
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return; // No .env file — fall back to whatever the shell provides.
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const existing = process.env[key];
    if (existing !== undefined && existing !== "") continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

/** Deterministic PRNG so repeated seeds produce identical demo data. */
export function makeRandom(seed = 20260927) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const random = makeRandom();
export const intBetween = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
export const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
export const daysAhead = (days: number) => new Date(Date.now() + days * 86_400_000);
export const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

/** Seed cost is deliberately low: demo credentials, not production secrets. */
export const SEED_BCRYPT_ROUNDS = 8;
export const hash = (plain: string) => bcrypt.hash(plain, SEED_BCRYPT_ROUNDS);

export interface SeedImage {
  url: string;
  thumbUrl?: string;
  width: number;
  height: number;
}

const IMAGE_VARIANTS = [
  { label: "Facade", from: "#0f766e", to: "#134e4a" },
  { label: "Room", from: "#1d4ed8", to: "#1e3a8a" },
  { label: "Kitchen", from: "#b45309", to: "#78350f" },
  { label: "Bathroom", from: "#0e7490", to: "#164e63" },
  { label: "Compound", from: "#15803d", to: "#14532d" },
  { label: "Street view", from: "#7c2d12", to: "#431407" },
];

export function imageLabel(index: number): string {
  return IMAGE_VARIANTS[index % IMAGE_VARIANTS.length]!.label;
}

/**
 * Generates labelled placeholder JPEGs under public/uploads/seed.
 * Every image says "DEMO IMAGE" so seed listings can never be mistaken for
 * photographs of a real property. Returns [] when sharp is unavailable.
 */
export async function generateSeedImages(): Promise<SeedImage[]> {
  const dir = path.join(process.cwd(), "public", "uploads", "seed");
  const images: SeedImage[] = [];

  try {
    const sharp = (await import("sharp")).default;
    await fs.mkdir(dir, { recursive: true });

    for (let i = 0; i < IMAGE_VARIANTS.length; i += 1) {
      const variant = IMAGE_VARIANTS[i]!;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${variant.from}"/>
      <stop offset="100%" stop-color="${variant.to}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#g)"/>
  <rect x="120" y="380" width="960" height="340" fill="#ffffff" opacity="0.12"/>
  <polygon points="120,380 600,150 1080,380" fill="#ffffff" opacity="0.18"/>
  <text x="600" y="280" font-family="Arial, sans-serif" font-size="58" font-weight="bold" fill="#ffffff" text-anchor="middle">${variant.label.toUpperCase()}</text>
  <text x="600" y="640" font-family="Arial, sans-serif" font-size="34" fill="#ffffff" opacity="0.85" text-anchor="middle">DEMO IMAGE — not a real property</text>
</svg>`;
      const main = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
      const fileName = `demo-${i + 1}.jpg`;
      await fs.writeFile(path.join(dir, fileName), main);

      const thumb = await sharp(main).resize(480, 320, { fit: "cover" }).jpeg({ quality: 68 }).toBuffer();
      const thumbName = `demo-${i + 1}_thumb.jpg`;
      await fs.writeFile(path.join(dir, thumbName), thumb);

      images.push({
        url: `/uploads/seed/${fileName}`,
        thumbUrl: `/uploads/seed/${thumbName}`,
        width: 1200,
        height: 800,
      });
    }
  } catch (error) {
    console.warn(
      "[seed] Could not generate placeholder images (is sharp installed?). " +
        "Listings will render without photos.",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Verification "documents" in the seed are placeholders: no real ID is ever
  // stored, and the row only carries this path.
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "demo-document-placeholder.txt"),
      "DEMO PLACEHOLDER — no real identity document is stored by the seed script.\n",
    );
  } catch {
    // Ignore: the placeholder is cosmetic.
  }

  return images;
}
