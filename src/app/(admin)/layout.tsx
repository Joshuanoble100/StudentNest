import Link from "next/link";
import { requireRolePage } from "@/lib/auth-helpers";
import { AdminNav } from "@/components/layout/admin-nav";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Shell for the whole admin panel.
 *
 * `requireRolePage` re-reads the user from the database on every request, so a
 * stale JWT can never keep a demoted or suspended account inside /admin.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRolePage("ADMIN");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-800 bg-slate-900">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-semibold text-white">
              StudentNest Admin
            </Link>
            <Badge variant="accent">Restricted area</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="hidden sm:inline">{user.email}</span>
            <Link href="/" className="font-medium text-white hover:underline">
              View site
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
