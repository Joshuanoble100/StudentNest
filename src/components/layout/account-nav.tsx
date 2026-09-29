"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  FileText,
  Heart,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Settings,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

function itemsFor(role: string): NavItem[] {
  const shared: NavItem[] = [
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/account", label: "Account settings", icon: Settings },
  ];

  if (role === "STUDENT") {
    return [
      { href: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/student/saved", label: "Saved & searches", icon: Heart },
      { href: "/dashboard/student/inquiries", label: "My inquiries", icon: FileText },
      { href: "/dashboard/student/reviews", label: "My reviews", icon: Star },
      { href: "/dashboard/student/roommate", label: "Roommate profile", icon: Users },
      ...shared,
    ];
  }

  if (role === "ADMIN") {
    return [{ href: "/admin", label: "Admin panel", icon: ShieldCheck }, ...shared];
  }

  return [
    { href: "/dashboard/landlord", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/landlord/properties", label: "My listings", icon: FileText },
    { href: "/dashboard/landlord/properties/new", label: "Add listing", icon: PlusCircle },
    { href: "/dashboard/landlord/inquiries", label: "Inquiries", icon: MessageSquare },
    { href: "/dashboard/landlord/reviews", label: "Reviews", icon: Star },
    { href: "/dashboard/landlord/billing", label: "Billing", icon: CreditCard },
    { href: "/dashboard/verification", label: "Verification", icon: ShieldCheck },
    ...shared,
  ];
}

/** Sidebar for every signed-in area; collapses to a horizontal scroller on mobile. */
export function AccountNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = itemsFor(role);

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-20">
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-brand-50 text-brand-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
