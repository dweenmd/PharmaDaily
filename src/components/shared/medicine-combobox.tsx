"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Pill } from "lucide-react";

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

export type MedicineOption = {
  id: string;
  name: string;
  generic_name: string | null;
  strength: string | null;
  unit: string | null;
  barcode: string | null;
};

type Props = {
  medicines: MedicineOption[];
  value: string | undefined;
  onSelect: (medicine: MedicineOption) => void;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
};

export function medicineLabel(m: Pick<MedicineOption, "name" | "strength" | "unit">): string {
  return [m.name, m.strength].filter(Boolean).join(" ");
}

/**
 * Searchable medicine picker.
 *
 * A plain <select> is unusable past a few hundred products, and a pharmacy
 * carries thousands. Matching covers brand name, generic name and barcode,
 * because staff reach for whichever they happen to know — and a scanner typing
 * a barcode into the search box should land on the right row.
 */
export function MedicineCombobox({ medicines, value, onSelect, disabled, id, ...aria }: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = medicines.find((m) => m.id === value);

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
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">{medicineLabel(selected)}</span>
          ) : (
            <span className="text-muted-foreground">Select medicine…</span>
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            // itemValue carries "name generic barcode" so one pass matches any
            // of them; Command's default filter only looks at the visible text.
            return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search name, generic or barcode…" />
          <CommandList>
            <CommandEmpty>
              <div className="text-muted-foreground flex flex-col items-center gap-1 py-4 text-sm">
                <Pill className="size-4" />
                No medicine found.
              </div>
            </CommandEmpty>
            <CommandGroup>
              {medicines.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.name} ${m.generic_name ?? ""} ${m.barcode ?? ""} ${m.id}`}
                  onSelect={() => {
                    onSelect(m);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value === m.id ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{medicineLabel(m)}</span>
                    {m.generic_name && (
                      <span className="text-muted-foreground block truncate text-xs">
                        {m.generic_name}
                      </span>
                    )}
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
