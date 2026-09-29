import type { Metadata } from "next";
import { requireRolePage } from "@/lib/auth-helpers";
import { listAuditLogs } from "@/lib/services/admin.service";
import { PageHeader } from "@/components/account/page-header";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/search/pagination";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Audit log", robots: { index: false } };

const PAGE_SIZE = 30;

/** Never echo credential-shaped values back into an admin screen, even from a log. */
const REDACTED_KEYS = /document|token|password|secret|credential|key|url/i;

function renderMetadata(value: unknown): { key: string; value: string }[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).map(([key, raw]) => ({
    key,
    value: REDACTED_KEYS.test(key)
      ? "redacted"
      : raw === null || raw === undefined
        ? "—"
        : typeof raw === "object"
          ? JSON.stringify(raw)
          : String(raw),
  }));
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireRolePage("ADMIN");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { items, total, totalPages } = await listAuditLogs(page, PAGE_SIZE, q || undefined);

  const hrefFor = (next: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (next > 1) query.set("page", String(next));
    const qs = query.toString();
    return qs ? `/admin/audit-logs?${qs}` : "/admin/audit-logs";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description={`${total} recorded decision${total === 1 ? "" : "s"}. Every moderation action, verification decision and account change writes a row here with the actor and the reason.`}
      />

      <Alert variant="info">
        <AlertTitle>This log is append-only</AlertTitle>
        There is no admin action that edits or deletes an audit entry. If a decision was wrong,
        record a new decision with a reason rather than trying to erase the first one — the trail is
        what makes the platform accountable.
      </Alert>

      <form method="get" action="/admin/audit-logs" className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1 space-y-1.5">
          <label htmlFor="audit-search" className="text-sm font-medium text-slate-700">
            Filter by action
          </label>
          <Input
            id="audit-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="e.g. review.moderate, user.suspend, verification"
            maxLength={80}
          />
        </div>
        <Button type="submit">Filter</Button>
        {q && (
          <Button type="button" variant="ghost" asChild>
            <a href="/admin/audit-logs">Clear</a>
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState
          title={q ? "No entries match that filter" : "Nothing recorded yet"}
          description={
            q
              ? "Action names look like property.approve or review.moderate.hide — try a shorter fragment."
              : "Moderation decisions will appear here as they are made."
          }
        />
      ) : (
        <ol className="space-y-2">
          {items.map((entry) => {
            const metadata = renderMetadata(entry.metadata);
            return (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{entry.action}</Badge>
                  <Badge variant="outline">{entry.entityType}</Badge>
                  <code className="max-w-full truncate rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
                    {entry.entityId}
                  </code>
                  <span className="ml-auto text-xs text-slate-500">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-700">
                  {entry.actor ? (
                    <>
                      <span className="font-medium text-slate-900">{entry.actor.name}</span>{" "}
                      <span className="text-slate-500">({entry.actor.email})</span>
                    </>
                  ) : (
                    <span className="text-slate-500">
                      {entry.actorEmail ?? "System"} · actor account no longer exists
                    </span>
                  )}
                </p>

                {metadata.length > 0 && (
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {metadata.map((field) => (
                      <div key={field.key} className="text-xs">
                        <dt className="inline font-medium text-slate-500">{field.key}: </dt>
                        <dd className="inline text-slate-700">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </div>
  );
}
