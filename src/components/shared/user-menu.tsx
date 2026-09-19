"use client";

import * as React from "react";
import Link from "next/link";
import { KeyRound, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { signOutAction } from "@/features/auth/actions";
import { ChangePasswordDialog } from "@/features/staff/components/change-password-dialog";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { type UserRole } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  name: string;
  role: UserRole;
  branchName: string | null;
};

/** "Rahim Uddin" -> "RU"; falls back to a single letter for one-word names. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

export function UserMenu({ name, role, branchName }: Props) {
  const [isPending, startTransition] = React.useTransition();
  const [passwordOpen, setPasswordOpen] = React.useState(false);

  function handleSignOut() {
    startTransition(async () => {
      try {
        // 1. Clean local Supabase client session if available
        try {
          const clientSupabase = createBrowserClient();
          await clientSupabase.auth.signOut({ scope: "local" });
        } catch {
          // Non-blocking local cleanup
        }

        // 2. Call server action to invalidate session & wipe cookies
        await signOutAction();

        // 3. Clear any client cookies as immediate defense-in-depth
        try {
          if (typeof document !== "undefined") {
            document.cookie.split(";").forEach((c) => {
              const eqPos = c.indexOf("=");
              const cookieName = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
              if (cookieName.startsWith("sb-") || cookieName.includes("auth-token")) {
                document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
              }
            });
          }
        } catch {}

        // 4. Clean hard navigation to /login to flush in-memory state and caches
        window.location.href = "/login";
      } catch (error) {
        console.error("Sign out error, executing fallback redirect:", error);
        // Fallback: even on error, clear client cookies and force navigation
        try {
          if (typeof document !== "undefined") {
            document.cookie.split(";").forEach((c) => {
              const eqPos = c.indexOf("=");
              const cookieName = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
              if (cookieName.startsWith("sb-") || cookieName.includes("auth-token")) {
                document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
              }
            });
          }
        } catch {}
        window.location.href = "/login";
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 px-2 rounded-xl flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Account menu">
          <Avatar className="size-7 border border-zinc-200 dark:border-zinc-800">
            <AvatarFallback className="text-[11px] font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">{initialsOf(name)}</AvatarFallback>
          </Avatar>
          <div className="hidden lg:flex flex-col text-left leading-none">
            <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">{name}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">{ROLE_LABELS[role] ?? "Staff"}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</span>
            {branchName && (
              <span className="text-muted-foreground truncate text-xs">{branchName}</span>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
          <KeyRound className="size-4" />
          Change password
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onSelect={(event) => {
            // Keep the menu open while the request is in flight so the spinner
            // is visible instead of the UI appearing to do nothing.
            event.preventDefault();
            handleSignOut();
          }}
        >
          {isPending ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
          {isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </DropdownMenu>
  );
}
