import type { Metadata } from "next";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth-helpers";
import { env, isProviderConfigured, isProviderLive } from "@/lib/env";
import { PageHeader } from "@/components/account/page-header";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Settings", robots: { index: false } };

type Integration = {
  name: string;
  provider: string;
  /** A real external provider is selected and holds its credentials. */
  live: boolean;
  /** The selected provider was asked for but its credentials are absent. */
  missingCredentials: boolean;
  fallback: string;
  variables: string[];
  impact: string;
};

export default async function AdminSettingsPage() {
  await requireRolePage("ADMIN");

  const integrations: Integration[] = [
    {
      name: "Image storage",
      provider: env.storage.provider,
      live: isProviderLive("storage"),
      missingCredentials: !isProviderConfigured("storage"),
      fallback: "Local disk (public/uploads and .data/uploads on the server)",
      variables:
        env.storage.provider === "supabase"
          ? ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"]
          : env.storage.provider === "cloudinary"
            ? ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
            : [],
      impact:
        "Local storage is lost on every deploy of a serverless platform. Set Supabase or Cloudinary before going live.",
    },
    {
      name: "Email",
      provider: env.email.provider,
      live: isProviderLive("email"),
      missingCredentials: !isProviderConfigured("email"),
      fallback: "Mock — emails are logged to the server console and never sent",
      variables: env.email.provider === "resend" ? ["RESEND_API_KEY", "EMAIL_FROM"] : [],
      impact:
        "Without a real provider, password resets and verification emails do not reach anyone. Sign-in still works with the mock.",
    },
    {
      name: "Maps",
      provider: env.maps.provider,
      live: isProviderLive("maps"),
      missingCredentials: !isProviderConfigured("maps"),
      fallback: "Static placeholder with an approximate-location notice",
      variables: env.maps.provider === "mapbox" ? ["NEXT_PUBLIC_MAPBOX_TOKEN"] : [],
      impact:
        "The public token is exposed to browsers by design. Never put a secret map key in a NEXT_PUBLIC_ variable.",
    },
    {
      name: "Payments",
      provider: env.payments.provider,
      live: isProviderLive("payments"),
      missingCredentials: !isProviderConfigured("payments"),
      fallback: "Mock — charges complete instantly and are marked as mock in the database",
      variables: env.payments.provider === "paystack" ? ["PAYSTACK_SECRET_KEY"] : [],
      impact:
        "Optional landlord services only. Core search, reviews and messaging never require a payment. Webhooks are accepted only when the x-paystack-signature header matches an HMAC-SHA512 of the raw body.",
    },
  ];

  const allLive = integrations.every((i) => i.live);
  const broken = integrations.filter((i) => i.missingCredentials);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Live configuration for this deployment. Values come from environment variables — nothing here is editable through the admin panel, and no secret is ever displayed."
      />

      {broken.length > 0 && (
        <Alert variant="danger">
          <AlertTitle>
            {broken.map((i) => i.name).join(", ")} selected but missing credentials
          </AlertTitle>
          <p className="text-sm">
            The provider is named in the environment but its keys are absent, so the code silently
            falls back to the mock. Set the variables listed on the card below, or change the
            provider back to the mock so the configuration says what it means.
          </p>
        </Alert>
      )}

      <Alert variant={allLive ? "success" : "warning"}>
        <AlertTitle>
          {allLive
            ? "All integrations are running on real providers"
            : `${integrations.filter((i) => !i.live).length} of ${integrations.length} integrations are running on mock or local fallbacks`}
        </AlertTitle>
        <p className="text-sm">
          Mock providers keep the app runnable with no credentials at all, but they do not send
          email, store files durably, or take real money.{" "}
          <Link href="/admin/analytics" className="font-medium underline">
            Analytics
          </Link>{" "}
          will show what is actually happening.
        </p>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{integration.name}</CardTitle>
                <Badge variant={integration.live ? "verified" : "pending"}>
                  {integration.provider}
                  {integration.live ? " · live" : " · mock fallback"}
                </Badge>
              </div>
              <CardDescription>{integration.impact}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!integration.live && (
                <p className="text-slate-600">
                  <span className="font-medium">Falling back to:</span> {integration.fallback}
                </p>
              )}
              {integration.variables.length > 0 && (
                <p className="text-slate-600">
                  <span className="font-medium">Variables read:</span>{" "}
                  <code className="text-xs">{integration.variables.join(", ")}</code>{" "}
                  <span className="text-slate-400">(names only — values are never rendered)</span>
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
          <CardDescription>Non-secret values that affect behaviour.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-600">Environment</dt>
              <dd className="font-medium text-slate-900">{env.nodeEnv}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-600">Public app URL</dt>
              <dd className="truncate font-medium text-slate-900">{env.appUrl}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-600">Max upload size</dt>
              <dd className="font-medium text-slate-900">{env.storage.maxUploadSizeMb} MB</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-600">Rate limit</dt>
              <dd className="font-medium text-slate-900">
                {env.rateLimit.maxRequests} requests / {env.rateLimit.windowSeconds}s
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-600">Email sender</dt>
              <dd className="truncate font-medium text-slate-900">{env.email.from}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-600">AUTH_SECRET</dt>
              <dd className="font-medium text-slate-900">
                {env.authSecret ? "set" : "missing — sessions will not persist"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-600">Database</dt>
              <dd className="font-medium text-slate-900">
                {env.databaseUrl ? "connected" : "DATABASE_URL missing"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-600">Private documents</dt>
              <dd className="font-medium text-slate-900">
                Served via /api/documents (admin-only, audited)
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate limiting caveat</CardTitle>
          <CardDescription>Read this before relying on abuse protection in production.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            Rate limits are tracked in server memory. On a single long-lived process that is
            effective; across serverless functions or multiple instances each process has its own
            counter, so the real ceiling is the configured limit multiplied by the number of
            instances.
          </p>
          <p>
            For a production deployment, move <code className="text-xs">assertRateLimit</code> in{" "}
            <code className="text-xs">src/lib/services/rate-limit.service.ts</code> onto a shared store (Upstash
            Redis or similar) before treating it as a security control.
          </p>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800">Demo data</CardTitle>
          <CardDescription>
            Seeded rows are flagged with <code className="text-xs">isDemoData</code> and labelled in
            the UI so they can never be mistaken for real students, landlords or reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            Before launching to real users, run the seeder against a scratch database only, or
            remove the seeded rows. The seeder prints the demo credentials it creates — those
            accounts must not exist in production.
          </p>
          <p>
            There is no &ldquo;delete everything&rdquo; button here on purpose: a bulk destructive
            action behind one click is exactly how real reviews get lost.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
