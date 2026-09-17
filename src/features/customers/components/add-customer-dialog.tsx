"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createCustomerAction } from "@/features/sales/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";

/**
 * Registers a customer outside of a sale.
 *
 * The counter already does this mid-sale (CustomerDialog, in the POS
 * feature) — this is the same createCustomerAction, for the times someone
 * wants a customer on file before they ever buy anything: a walk-in signing
 * up, or catching up a paper register.
 */
export function AddCustomerDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setError(null);
    }
  }

  function submit() {
    if (name.trim() === "") {
      setError("Enter a name");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createCustomerAction({ name, phone, email, address });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success("Customer added");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add customer
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a customer</DialogTitle>
          <DialogDescription>
            Phone or email is enough to find them again next visit — neither is required on its
            own.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="add-customer-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rahim Uddin"
              autoFocus
              disabled={isPending}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-customer-phone">Phone</Label>
            <Input
              id="add-customer-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+880 1XXX-XXXXXX"
              type="tel"
              inputMode="tel"
              disabled={isPending}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-customer-email">Email</Label>
            <Input
              id="add-customer-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rahim@example.com"
              type="email"
              inputMode="email"
              disabled={isPending}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-customer-address">Address</Label>
            <Input
              id="add-customer-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House 12, Road 5, Dhanmondi, Dhaka"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || name.trim() === ""}>
            {isPending && <Spinner />}
            Add customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
