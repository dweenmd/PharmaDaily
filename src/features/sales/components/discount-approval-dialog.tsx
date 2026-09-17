"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { requestDiscountOverrideAction } from "@/features/sales/discount-override-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  discountPercent: number;
  onApproved: (token: string) => void;
};

/**
 * Stands in for a manager typing their own password at the till.
 *
 * The cashier's own session is untouched throughout — the password check
 * happens on the server against an ephemeral, non-persisted client, never
 * against this session. See requestDiscountOverrideAction.
 */
export function DiscountApprovalDialog({
  open,
  onOpenChange,
  branchId,
  discountPercent,
  onApproved,
}: Props) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setEmail("");
      setPassword("");
      setError(null);
    }
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await requestDiscountOverrideAction({
        branchId,
        discountPercent,
        email,
        password,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success("Discount approved", { description: `Approved by ${result.data.approverName}` });
      onApproved(result.data.token);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="text-amber-600 dark:text-amber-500" />
            Manager approval needed
          </DialogTitle>
          <DialogDescription>
            This discount ({Math.round(discountPercent)}%) is above what a cashier can give alone.
            A branch manager or super admin has to approve it here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="approver-email">Manager&apos;s email</Label>
            <Input
              id="approver-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              disabled={isPending}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="approver-password">Manager&apos;s password</Label>
            <Input
              id="approver-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <p className="text-muted-foreground text-xs">
              Checked without touching your own session — you stay signed in as yourself.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || email === "" || password === ""}>
            {isPending && <Spinner />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
