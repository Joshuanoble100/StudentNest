import type { Metadata } from "next";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth-helpers";
import { listUsers } from "@/lib/services/admin.service";
import { PageHeader } from "@/components/account/page-header";
import { AdminAction } from "@/components/admin/admin-action";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/search/pagination";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Users", robots: { index: false } };

const ROLE_TABS = ["", "STUDENT", "LANDLORD", "AGENT", "ADMIN"] as const;
const STATUS_TABS = ["", "ACTIVE", "SUSPENDED", "DELETED"] as const;

const STATUS_VARIANT = {
  ACTIVE: "verified",
  SUSPENDED: "rejected",
  DELETED: "neutral",
} as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string; id?: string }>;
}) {
  await requireRolePage("ADMIN");
  const params = await searchParams;
  const role = ROLE_TABS.includes((params.role ?? "") as never) ? (params.role ?? "") : "";
  const status = STATUS_TABS.includes((params.status ?? "") as never) ? (params.status ?? "") : "";
  const q = (params.q ?? "").trim().slice(0, 120);
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { items, total, totalPages } = await listUsers({
    q: q || undefined,
    role: role || undefined,
    status: status || undefined,
    page,
    pageSize: 20,
  });

  const hrefFor = (next: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (role) query.set("role", role);
    if (status) query.set("status", status);
    if (next > 1) query.set("page", String(next));
    const qs = query.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  const tabHref = (key: "role" | "status", value: string) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    const nextRole = key === "role" ? value : role;
    const nextStatus = key === "status" ? value : status;
    if (nextRole) query.set("role", nextRole);
    if (nextStatus) query.set("status", nextStatus);
    const qs = query.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  const filtered = Boolean(q || role || status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={`${total} account${total === 1 ? "" : "s"}${filtered ? " match these filters" : ""}. Suspension also pulls the person's listings out of search; nothing here is ever deleted permanently.`}
      />

      <Alert variant="warning">
        <AlertTitle>Act on evidence, not on a single report</AlertTitle>
        Suspending an account removes their listings from every student's search. Check the
        linked reports and audit history first, and always record a reason — the affected person
        receives it verbatim.
      </Alert>

      <form method="get" action="/admin/users" className="flex flex-wrap items-end gap-3">
        {role && <input type="hidden" name="role" value={role} />}
        {status && <input type="hidden" name="status" value={status} />}
        <div className="min-w-[240px] flex-1 space-y-1.5">
          <label htmlFor="user-search" className="text-sm font-medium text-slate-700">
            Search by name or email
          </label>
          <Input
            id="user-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="e.g. chioma or emeka.owner@"
            maxLength={120}
          />
        </div>
        <Button type="submit">Search</Button>
        {filtered && (
          <Button type="button" variant="ghost" asChild>
            <Link href="/admin/users">Clear filters</Link>
          </Button>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((value) => (
          <Link
            key={value || "all-roles"}
            href={tabHref("role", value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              role === value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
            )}
          >
            {value ? ROLE_LABELS[value as keyof typeof ROLE_LABELS] : "All roles"}
          </Link>
        ))}
        <span className="mx-1 hidden h-7 w-px self-center bg-slate-200 sm:block" />
        {STATUS_TABS.map((value) => (
          <Link
            key={value || "all-statuses"}
            href={tabHref("status", value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              status === value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
            )}
          >
            {value ? USER_STATUS_LABELS[value as keyof typeof USER_STATUS_LABELS] : "All statuses"}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={filtered ? "No accounts match these filters" : "No accounts yet"}
          description={
            filtered
              ? "Try a different name, email, or clear the filters."
              : "Once people register they will appear here."
          }
          action={
            filtered ? (
              <Button asChild variant="outline">
                <Link href="/admin/users">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((user) => {
            const endpoint = `/api/admin/users/${user.id}/moderate`;
            const isAdmin = user.role === "ADMIN";
            return (
              <li
                key={user.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{user.name}</p>
                      <Badge variant="neutral">{ROLE_LABELS[user.role]}</Badge>
                      <Badge variant={STATUS_VARIANT[user.status] ?? "neutral"}>
                        {USER_STATUS_LABELS[user.status]}
                      </Badge>
                      {!user.emailVerified && <Badge variant="pending">Email unverified</Badge>}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">{user.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Joined {formatDate(user.createdAt)}
                      {user.phone ? ` · ${user.phone}` : " · no phone on file"} ·{" "}
                      {user._count.ownedProperties} listing
                      {user._count.ownedProperties === 1 ? "" : "s"}, {user._count.reviews} review
                      {user._count.reviews === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/admin/reports?targetId=${user.id}`}>Reports</Link>
                    </Button>
                    {user._count.ownedProperties > 0 && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/admin/properties?ownerId=${user.id}`}>Listings</Link>
                      </Button>
                    )}
                    {user.status === "SUSPENDED" ? (
                      <AdminAction
                        endpoint={endpoint}
                        action="REACTIVATE"
                        label="Reactivate"
                        description="Restores the account. Suspended listings stay suspended until you approve them again individually."
                      />
                    ) : (
                      <AdminAction
                        endpoint={endpoint}
                        action="SUSPEND"
                        label="Suspend"
                        requiresReason
                        variant="destructive"
                        description="Blocks sign-in and pulls this person's listings out of search immediately."
                      />
                    )}
                    {isAdmin ? (
                      <AdminAction
                        endpoint={endpoint}
                        action="DEMOTE_ADMIN"
                        label="Remove admin"
                        description="Downgrades this account to a landlord account. You cannot remove your own admin access."
                      />
                    ) : (
                      <AdminAction
                        endpoint={endpoint}
                        action="PROMOTE_ADMIN"
                        label="Make admin"
                        description="Grants full moderation access, including private verification documents. Only do this for vetted team members."
                      />
                    )}
                    <AdminAction
                      endpoint={endpoint}
                      action="DELETE"
                      label="Delete"
                      requiresReason
                      variant="destructive"
                      description="Soft-deletes the account and its listings. Reviews already published stay on record with the author marked as deleted — removing them would rewrite history other students relied on."
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </div>
  );
}
