"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  EXPENSE_CATEGORIES,
  type ExpenseInput,
} from "@/features/expenses/schemas";
import { createExpenseAction } from "@/features/expenses/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseDialog({ branchId }: { branchId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<(typeof EXPENSE_CATEGORIES)[number]>("Rent");
  const [amount, setAmount] = React.useState<number>(0);
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setCategory("Rent");
      setAmount(0);
      setDescription("");
      setDate(today());
      setError(null);
    }
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await createExpenseAction(branchId, {
        category,
        amount: Number(amount),
        description: description.trim() === "" ? null : description.trim(),
        expense_date: date,
      } as ExpenseInput);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success("Expense recorded");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Record expense
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record expense</DialogTitle>
          <DialogDescription>
            Operating costs for this branch. These are what turn gross margin into actual profit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="expense-category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as (typeof EXPENSE_CATEGORIES)[number])}
              disabled={isPending}
            >
              <SelectTrigger id="expense-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expense-amount"
                value={amount || ""}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                inputMode="decimal"
                className="text-right tabular-nums"
                autoFocus
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-description">Note</Label>
            <Input
              id="expense-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || amount <= 0}>
            {isPending && <Spinner />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
