/**
 * Typed access to environment configuration.
 * All third-party integrations degrade to mock/local providers when
 * credentials are absent so the app runs out of the box in development.
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",

  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: optional("AUTH_SECRET") ?? "",
  appUrl: optional("AUTH_URL") ?? optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",

  storage: {
    provider: (optional("STORAGE_PROVIDER") ?? "local") as "local" | "supabase" | "cloudinary",
    supabaseUrl: optional("SUPABASE_URL"),
    supabaseAnonKey: optional("SUPABASE_ANON_KEY"),
    supabaseServiceKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseBucket: optional("SUPABASE_STORAGE_BUCKET") ?? "studentnest",
    cloudinaryCloudName: optional("CLOUDINARY_CLOUD_NAME"),
    cloudinaryApiKey: optional("CLOUDINARY_API_KEY"),
    cloudinaryApiSecret: optional("CLOUDINARY_API_SECRET"),
    maxUploadSizeMb: Number(optional("MAX_UPLOAD_SIZE_MB") ?? 8),
  },

  maps: {
    provider: (optional("MAP_PROVIDER") ?? "mock") as "mock" | "mapbox",
    mapboxToken: optional("NEXT_PUBLIC_MAPBOX_TOKEN"),
  },

  email: {
    provider: (optional("EMAIL_PROVIDER") ?? "mock") as "mock" | "resend",
    resendApiKey: optional("RESEND_API_KEY"),
    from: optional("EMAIL_FROM") ?? "StudentNest <no-reply@studentnest.local>",
  },

  payments: {
    provider: (optional("PAYMENT_PROVIDER") ?? "mock") as "mock" | "paystack",
    paystackSecretKey: optional("PAYSTACK_SECRET_KEY"),
  },

  rateLimit: {
    windowSeconds: Number(optional("RATE_LIMIT_WINDOW_SECONDS") ?? 60),
    maxRequests: Number(optional("RATE_LIMIT_MAX_REQUESTS") ?? 100),
  },
} as const;

/** True when the configured provider needs credentials that are missing. */
export function isProviderConfigured(provider: "storage" | "maps" | "email" | "payments"): boolean {
  switch (provider) {
    case "storage":
      if (env.storage.provider === "local") return true;
      if (env.storage.provider === "supabase")
        return Boolean(env.storage.supabaseUrl && env.storage.supabaseServiceKey);
      return Boolean(
        env.storage.cloudinaryCloudName && env.storage.cloudinaryApiKey && env.storage.cloudinaryApiSecret,
      );
    case "maps":
      return env.maps.provider === "mapbox" ? Boolean(env.maps.mapboxToken) : true;
    case "email":
      return env.email.provider === "resend" ? Boolean(env.email.resendApiKey) : true;
    case "payments":
      return env.payments.provider === "paystack" ? Boolean(env.payments.paystackSecretKey) : true;
  }
}
