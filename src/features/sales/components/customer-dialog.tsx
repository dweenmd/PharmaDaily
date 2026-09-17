"use client";

import * as React from "react";
import { Check, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";

import { createCustomerAction } from "@/features/sales/actions";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

export type PosCustomer = {
  id: string;
  name: string;
  phone: string | null;
  due_amount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: PosCustomer[];
  selected: PosCustomer | null;
  onSelect: (customer: PosCustomer | null) => void;
};

export function CustomerDialog({ open, onOpenChange, customers, selected, onSelect }: Props) {
  const [query, setQuery] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  // Newly registered customers are held locally so they are selectable
  // immediately, without waiting for the page's server data to refresh.
  const [added, setAdded] = React.useState<PosCustomer[]>([]);

  // Cleared when the dialog closes, adjusted during render rather than in an
  // effect for the same reason as the payment dialog: the next open must not
  // briefly show the previous search.
  const [wasOpen, setWasOpen] = React.useState(open);

  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setQuery("");
      setAdding(false);
      setName("");
      setPhone("");
    }
  }

  const all = React.useMemo(() => [...added, ...customers], [added, customers]);

  const results = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return all.slice(0, 50);
    return all
      .filter(
        (c) => c.name.toLowerCase().includes(term) || (c.phone ?? "").toLowerCase().includes(term),
      )
      .slice(0, 50);
  }, [all, query]);

  function submitNewCustomer() {
    if (name.trim() === "") {
      toast.error("Enter a name");
      return;
    }

    startTransition(async () => {
      const result = await createCustomerAction({ name, phone, address: null });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setAdded((current) => [result.data, ...current]);
      onSelect(result.data);
      toast.success("Customer added");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer</DialogTitle>
          <DialogDescription>
            Needed only when part of the sale is on credit. Otherwise leave it as a walk-in.
          </DialogDescription>
        </DialogHeader>

        {adding ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahim Uddin"
                autoFocus
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1XXX-XXXXXX"
                type="tel"
                inputMode="tel"
                disabled={isPending}
              />
              <p className="text-muted-foreground text-xs">
                How the counter finds them next time. Must be unique.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={submitNewCustomer} disabled={isPending}>
                {isPending && <Spinner />}
                Add customer
              </Button>
              <Button variant="ghost" onClick={() => setAdding(false)} disabled={isPending}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or phone…"
                className="pl-9"
                autoFocus
              />
            </div>

            <Button variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              New customer
            </Button>

            <Separator />

            <ScrollArea className="max-h-72">
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm"
                  >
                    <Check
                      className={`size-4 ${selected === null ? "opacity-100" : "opacity-0"}`}
                    />
                    <UserRound className="text-muted-foreground size-4" />
                    Walk-in customer
                  </button>
                </li>

                {results.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(customer)}
                      className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm"
                    >
                      <Check
                        className={`size-4 shrink-0 ${
                          selected?.id === customer.id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{customer.name}</span>
                        {customer.phone && (
                          <span className="text-muted-foreground block text-xs">
                            {customer.phone}
                          </span>
                        )}
                      </span>
                      {customer.due_amount > 0 && (
                        <span className="shrink-0 text-xs text-amber-600 dark:text-amber-500">
                          {formatCurrency(customer.due_amount)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}

                {results.length === 0 && query && (
                  <li className="text-muted-foreground px-2 py-6 text-center text-sm">
                    No customer matches that.
                  </li>
                )}
              </ul>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
