import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth-helpers";
import { listNotifications } from "@/lib/services/notification.service";
import { PageHeader } from "@/components/account/page-header";
import { NotificationList } from "@/components/notifications/notification-list";
import { Pagination } from "@/components/search/pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Notifications" };

const PAGE_SIZE = 20;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUserPage("/notifications");
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  const { items, total, unreadCount, totalPages } = await listNotifications(user.id, page, PAGE_SIZE);

  const hrefFor = (next: number) =>
    next === 1 ? "/notifications" : `/notifications?page=${next}`;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Inquiry replies, messages, saved-property price changes and listing updates."
      />
      <NotificationList
        items={items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
        unreadCount={unreadCount}
      />
      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
      <p className="mt-4 text-center text-xs text-slate-400">
        Showing page {page} of {totalPages} · {total} total
      </p>
    </div>
  );
}
