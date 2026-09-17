"use client";

import * as React from "react";
import { toast } from "sonner";

import { changeOwnPasswordAction } from "@/features/staff/actions";
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
};

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const [current, setCurrent] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setCurrent("");
      setPassword("");
      setConfirm("");
      setError(null);
    }
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await changeOwnPasswordAction({ current, password, confirm });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success("Password changed");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change your password</DialogTitle>
          <DialogDescription>
            Worth doing if someone else set up your account — they still know the password they gave
            you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">At least 12 characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Repeat new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={isPending || current === "" || password.length < 12 || confirm === ""}
          >
            {isPending && <Spinner />}
            Change password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
