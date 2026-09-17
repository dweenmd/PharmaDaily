"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import {
  ResendInviteButton,
  ResetPasswordDialog,
  StaffDialog,
} from "@/features/staff/components/staff-dialog";
import { type StaffAuthMeta, type StaffRow } from "@/features/staff/queries";
import { ROLE_LABELS, USER_ROLES } from "@/lib/auth/roles";
import { formatDate, formatDateTime } from "@/lib/format";
import { type UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BranchOption = { id: string; name: string; code: string };

type Props = {
  staff: StaffRow[];
  authMeta: Record<string, StaffAuthMeta>;
  branches: BranchOption[];
  isSuperAdmin: boolean;
  ownBranchId: string | null;
  currentProfileId: string;
};

/** Never signed in, so any "how long ago" phrasing would be a guess. */
function lastActive(iso: string | null): string {
  if (!iso) return "Never signed in";
  return formatDateTime(iso);
}

export function StaffTable({
  staff,
  authMeta,
  branches,
  isSuperAdmin,
  ownBranchId,
  currentProfileId,
}: Props) {
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<UserRole | "all">("all");
  const [branchFilter, setBranchFilter] = React.useState<string>("all");

  // A branch manager cannot act on their own level or above, so those rows
  // are shown but not editable. Saying so beats an Edit button that always
  // fails.
  function canEdit(target: StaffRow) {
    if (isSuperAdmin) return true;
    return target.role !== "super_admin" && target.role !== "branch_manager";
  }

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();

    return staff.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (branchFilter !== "all" && member.branch_id !== branchFilter) return false;

      if (!term) return true;
      const email = authMeta[member.auth_id]?.email ?? "";
      return member.name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
    });
  }, [staff, authMeta, query, roleFilter, branchFilter]);

  const hasFilters = query !== "" || roleFilter !== "all" || branchFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
            aria-label="Search staff"
          />
        </div>

        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {USER_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isSuperAdmin && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setRoleFilter("all");
              setBranchFilter("all");
            }}
          >
            <X className="size-4" />
            Clear
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No staff match these filters.
        </p>
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  {isSuperAdmin && <TableHead className="hidden md:table-cell">Branch</TableHead>}
                  <TableHead className="hidden lg:table-cell">Since</TableHead>
                  <TableHead className="hidden xl:table-cell">Last active</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((member) => {
                  const editable = canEdit(member);
                  const isSelf = member.id === currentProfileId;
                  const meta = authMeta[member.auth_id];
                  const pendingInvite = !member.password_set;

                  return (
                    <TableRow key={member.id} className={member.is_active ? "" : "opacity-60"}>
                      <TableCell className="font-medium">
                        {member.name}
                        {isSelf && (
                          <span className="text-muted-foreground ml-1.5 text-xs">(you)</span>
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground hidden max-w-48 truncate text-sm sm:table-cell">
                        {meta?.email ?? "—"}
                      </TableCell>

                      <TableCell>
                        <Badge variant={member.role === "super_admin" ? "default" : "secondary"}>
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      </TableCell>

                      {isSuperAdmin && (
                        <TableCell className="hidden md:table-cell">
                          {member.branch ? (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {member.branch.code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">All branches</span>
                          )}
                        </TableCell>
                      )}

                      <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                        {formatDate(member.created_at)}
                      </TableCell>

                      <TableCell className="text-muted-foreground hidden text-sm xl:table-cell">
                        {lastActive(meta?.last_sign_in_at ?? null)}
                      </TableCell>

                      <TableCell>
                        {pendingInvite ? (
                          <Badge variant="outline" className="text-amber-700 dark:text-amber-500">
                            Invited
                          </Badge>
                        ) : (
                          <Badge variant={member.is_active ? "default" : "outline"}>
                            {member.is_active ? "Active" : "Deactivated"}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {editable ? (
                          <div className="flex items-center justify-end gap-0.5">
                            {pendingInvite && <ResendInviteButton staff={member} />}
                            <ResetPasswordDialog staff={member} />
                            <StaffDialog
                              branches={branches}
                              isSuperAdmin={isSuperAdmin}
                              ownBranchId={ownBranchId}
                              staff={member}
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground block text-right text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
