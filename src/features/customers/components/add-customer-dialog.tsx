"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  NewCustomerForm,
  type CreatedCustomerResult,
} from "@/features/customers/components/new-customer-form";

export function AddCustomerDialog({
  trigger,
  onCustomerCreated,
}: {
  trigger?: React.ReactNode;
  onCustomerCreated?: (customer: CreatedCustomerResult) => void;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-10 px-4 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs gap-1.5 cursor-pointer">
            <Plus className="size-4" />
            <span>+ New Customer</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl md:max-w-2xl p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">New Customer Modal</DialogTitle>
        <NewCustomerForm
          isModal
          onCancel={() => setOpen(false)}
          onSuccess={(customer) => {
            setOpen(false);
            if (onCustomerCreated) {
              onCustomerCreated(customer);
            }
            router.refresh();
          }}
          onSelectExisting={(existing) => {
            setOpen(false);
            router.push(`/pos?customerId=${existing.id}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
