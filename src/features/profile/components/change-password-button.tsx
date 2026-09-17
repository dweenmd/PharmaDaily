"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";

import { ChangePasswordDialog } from "@/features/staff/components/change-password-dialog";
import { Button } from "@/components/ui/button";

export function ChangePasswordButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" />
        Change password
      </Button>
      <ChangePasswordDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
