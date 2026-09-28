"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { LayoutDashboard, Heart, LogOut, Settings, ShieldCheck, MessageSquare, PlusCircle } from "lucide-react";

interface UserMenuProps {
  user: { name: string; email: string; role: string };
}

function dashboardHome(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "STUDENT":
      return "/dashboard/student";
    default:
      return "/dashboard/landlord";
  }
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full ring-offset-2 transition-shadow hover:ring-2 hover:ring-brand-600 focus-visible:outline-2 focus-visible:outline-brand-600"
          aria-label="Account menu"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs font-normal text-slate-500">{user.email}</p>
          <p className="mt-1 text-xs font-medium capitalize text-brand-700">{user.role.toLowerCase()}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={dashboardHome(user.role)}>
            <LayoutDashboard aria-hidden /> Dashboard
          </Link>
        </DropdownMenuItem>
        {user.role === "STUDENT" && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/student/saved">
                <Heart aria-hidden /> Saved properties
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/messages">
                <MessageSquare aria-hidden /> Messages
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {(user.role === "LANDLORD" || user.role === "AGENT") && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard/landlord/properties/new">
              <PlusCircle aria-hidden /> Add property
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck aria-hidden /> Admin panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/account">
            <Settings aria-hidden /> Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            signOut({ callbackUrl: "/" });
          }}
        >
          <LogOut aria-hidden /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
