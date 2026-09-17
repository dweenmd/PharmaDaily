"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PackageSearch } from "lucide-react";

import { type StockRow } from "@/features/stock/queries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  batches: StockRow[];
  value: string | undefined;
  onSelect: (batch: StockRow) => void;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
};

function label(batch: StockRow) {
  return [batch.medicine?.name, batch.medicine?.strength].filter(Boolean).join(" ");
}

/**
 * Batch picker for the stock adjustment screen.
 *
 * Was a plain select, which is fine for a demo and unusable for a real
 * pharmacy: a branch can easily hold several hundred batches, and scrolling a
 * native dropdown to find one is not a way to correct a miscount. The purchase
 * screen already solved the same problem with a searchable list; this is that,
 * applied to batches.
 *
 * Matching covers medicine name, generic name and batch number, because staff
 * arrive with whichever of the three is printed on the box in their hand.
 */
export function BatchCombobox({ batches, value, onSelect, disabled, id, ...aria }: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = batches.find((b) => b.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={aria["aria-invalid"]}
          disabled={disabled}
          className="h-auto w-full justify-between py-2 font-normal"
        >
          {selected ? (
            <span className="min-w-0 text-left">
              <span className="block truncate">{label(selected)}</span>
              <span className="text-muted-foreground block text-xs">
                Batch {selected.batch_no} · {selected.quantity} in stock
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a batch…</span>
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search medicine or batch number…" />
          <CommandList>
            <CommandEmpty>
              <div className="text-muted-foreground flex flex-col items-center gap-1 py-4 text-sm">
                <PackageSearch className="size-4" />
                No batch found.
              </div>
            </CommandEmpty>
            <CommandGroup>
              {batches.map((batch) => (
                <CommandItem
                  key={batch.id}
                  value={`${batch.medicine?.name ?? ""} ${batch.medicine?.generic_name ?? ""} ${batch.batch_no} ${batch.id}`}
                  onSelect={() => {
                    onSelect(batch);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      value === batch.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{label(batch)}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      Batch {batch.batch_no} · exp {formatDate(batch.expiry_date)}
                    </span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {batch.quantity}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
