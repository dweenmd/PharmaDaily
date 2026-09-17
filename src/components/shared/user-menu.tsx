"use client";

import * as React from "react";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { signOutAction } from "@/features/auth/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
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

  function handleSignOut() {
    startTransition(async () => {
      try {
        await signOutAction();
      } catch (error) {
        // redirect() inside a server action throws a control-flow signal that
        // must not be swallowed, or the user stays on a page they are no
        // longer authorised for.
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
        toast.error("Could not sign out", { description: "Check your connection and try again." });
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-medium">{initialsOf(name)}</AvatarFallback>
          </Avatar>
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

        <DropdownMenuItem disabled>
          <UserIcon className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="size-4" />
          Settings
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
    </DropdownMenu>
  );
}
