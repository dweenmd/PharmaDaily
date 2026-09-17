"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  createStaffAction,
  resendInviteAction,
  resetStaffPasswordAction,
  updateStaffAction,
} from "@/features/staff/actions";
import { MANAGER_ASSIGNABLE_ROLES } from "@/features/staff/schemas";
import { type StaffRow } from "@/features/staff/queries";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, USER_ROLES } from "@/lib/auth/roles";
import { type UserRole } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type BranchOption = { id: string; name: string };

type Props = {
  branches: BranchOption[];
  isSuperAdmin: boolean;
  ownBranchId: string | null;
  /** Present when editing. */
  staff?: StaffRow;
};

/** A password the admin does not have to invent, and will not reuse. */
function suggestPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function StaffDialog({ branches, isSuperAdmin, ownBranchId, staff }: Props) {
  const router = useRouter();
  const isEdit = Boolean(staff);

  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [sendInvite, setSendInvite] = React.useState(false);
  const [role, setRole] = React.useState<UserRole>("cashier");
  const [branchId, setBranchId] = React.useState<string | null>(null);
  const [isActive, setIsActive] = React.useState(true);

  // Reset during render, so a previous person's details never paint.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setName(staff?.name ?? "");
      setEmail("");
      setPassword(isEdit ? "" : suggestPassword());
      setSendInvite(false);
      setRole(staff?.role ?? "cashier");
      setBranchId(staff?.branch_id ?? (isSuperAdmin ? null : ownBranchId));
      setIsActive(staff?.is_active ?? true);
      setError(null);
    }
  }

  // A branch manager may only create roles below their own — otherwise they
  // could mint a second, more privileged account for themselves.
  const assignableRoles: readonly UserRole[] = isSuperAdmin
    ? USER_ROLES
    : (MANAGER_ASSIGNABLE_ROLES as readonly UserRole[]);

  const needsBranch = role !== "super_admin";

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateStaffAction(staff!.id, {
            name,
            role,
            branch_id: needsBranch ? branchId : null,
            is_active: isActive,
          })
        : await createStaffAction({
            name,
            email,
            password,
            send_invite: sendInvite,
            role,
            branch_id: needsBranch ? branchId : null,
          });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(isEdit ? "Staff member updated" : "Account created", {
        description: isEdit
          ? undefined
          : sendInvite
            ? `An invite email is on its way to ${email}.`
            : "Give them the password and ask them to change it after signing in.",
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            Add staff
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? staff!.name : "Add a staff member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Role and branch decide what they can see and do."
              : "They sign in with this email and password. There is no public sign-up."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="staff-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rahim Uddin"
              autoFocus
              disabled={isPending}
            />
          </div>

          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="staff-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahim@pharmacy.com"
                  disabled={isPending}
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={sendInvite}
                  onCheckedChange={(v) => setSendInvite(v === true)}
                  disabled={isPending}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Email them an invite instead</span>
                  <span className="text-muted-foreground block text-xs">
                    They set their own password by following a link. Needs email delivery to be
                    reachable — for a counter that hands over a printed password in person, leave
                    this off.
                  </span>
                </span>
              </label>

              {sendInvite ? (
                <Alert>
                  <AlertDescription>
                    An invite email goes to {email || "this address"} once you create the account.
                    Nobody can sign in until they follow it and choose a password.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="staff-password">
                    Initial password <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="staff-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="font-mono text-sm"
                      disabled={isPending}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPassword(suggestPassword())}
                      disabled={isPending}
                      aria-label="Generate another password"
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Hand this over in person. They can change it from their account menu — and
                    should, since you know it.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="staff-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={isPending}>
              <SelectTrigger id="staff-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{ROLE_DESCRIPTIONS[role]}</p>
          </div>

          {needsBranch && (
            <div className="space-y-2">
              <Label htmlFor="staff-branch">
                Branch <span className="text-destructive">*</span>
              </Label>
              <Select
                value={branchId ?? ""}
                onValueChange={(v) => setBranchId(v)}
                disabled={isPending || !isSuperAdmin}
              >
                <SelectTrigger id="staff-branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isSuperAdmin && (
                <p className="text-muted-foreground text-xs">
                  You can only add staff to your own branch.
                </p>
              )}
            </div>
          )}

          {isEdit && (
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
                disabled={isPending}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">Active</span>
                <span className="text-muted-foreground block text-xs">
                  Deactivating takes effect immediately, even if they are signed in — they lose
                  access on their next request.
                </span>
              </span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              isPending ||
              name.trim() === "" ||
              (!isEdit &&
                (email.trim() === "" || (!sendInvite && password.length < 12))) ||
              (needsBranch && !branchId)
            }
          >
            {isPending && <Spinner />}
            {isEdit ? "Save" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export function ResetPasswordDialog({ staff }: { staff: StaffRow }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setPassword(suggestPassword());
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Reset password for ${staff.name}`}>
          <KeyRound className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            {staff.name} will need this to sign in. Their existing sessions stay valid until they
            expire.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="reset-password">New password</Label>
          <div className="flex gap-2">
            <Input
              id="reset-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono text-sm"
              disabled={isPending}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPassword(suggestPassword())}
              disabled={isPending}
              aria-label="Generate another password"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            disabled={isPending || password.length < 12}
            onClick={() =>
              startTransition(async () => {
                const result = await resetStaffPasswordAction(staff.id, password);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                toast.success("Password reset", { description: "Hand it over in person." });
                setOpen(false);
                router.refresh();
              })
            }
          >
            {isPending && <Spinner />}
            Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

/** For an account still waiting on its first invite email. */
export function ResendInviteButton({ staff }: { staff: StaffRow }) {
  const [isPending, startTransition] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Resend invite to ${staff.name}`}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await resendInviteAction(staff.id);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Invite resent");
        })
      }
    >
      {isPending ? <Spinner /> : <Mail className="size-4" />}
    </Button>
  );
}
