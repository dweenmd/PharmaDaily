"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  Package,
  Pill,
  Receipt,
  Search,
  ShoppingCart,
  Truck,
  Users,
  X,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type SearchCategory = "all" | "medicines" | "customers" | "sales" | "purchases" | "suppliers";

export type GlobalSearchResultItem = {
  id: string;
  category: "medicines" | "customers" | "sales" | "purchases" | "suppliers";
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
  badge?: string;
};

const SAMPLE_SEARCH_DATA: GlobalSearchResultItem[] = [
  // Medicines
  {
    id: "med-1",
    category: "medicines",
    title: "Paracetamol 500 mg",
    subtitle: "Napa / Ace · Beximco Pharma · Tablet",
    meta: "Stock: 450 strips · ৳12.00",
    href: "/medicines",
    badge: "Fast Moving",
  },
  {
    id: "med-2",
    category: "medicines",
    title: "Azithromycin 500 mg",
    subtitle: "Zimax · Square Pharma · Capsule",
    meta: "Stock: 120 strips · ৳35.00",
    href: "/medicines",
    badge: "Rx",
  },
  {
    id: "med-3",
    category: "medicines",
    title: "Omeprazole 20 mg",
    subtitle: "Seclo · Square Pharma · Capsule",
    meta: "Stock: 800 caps · ৳6.00",
    href: "/medicines",
  },
  {
    id: "med-4",
    category: "medicines",
    title: "Amoxicillin 500 mg",
    subtitle: "Moxacil · Square Pharma · Capsule",
    meta: "Stock: 60 strips · ৳8.50",
    href: "/medicines",
    badge: "Rx",
  },

  // Customers
  {
    id: "cust-1",
    category: "customers",
    title: "Md. Rahim",
    subtitle: "017XXXXXXXX · Dhanmondi, Dhaka",
    meta: "Credit Due: ৳450.00 · Regular Patient",
    href: "/customers",
    badge: "Credit Due",
  },
  {
    id: "cust-2",
    category: "customers",
    title: "Tanvir Ahmed",
    subtitle: "018XXXXXXXX · Gulshan, Dhaka",
    meta: "Credit Due: ৳0.00 · VIP Customer",
    href: "/customers",
  },
  {
    id: "cust-3",
    category: "customers",
    title: "Dr. Shamsul Huda",
    subtitle: "019XXXXXXXX · Dhaka Medical College",
    meta: "Registered Prescriber",
    href: "/customers",
  },

  // Sales
  {
    id: "sale-1",
    category: "sales",
    title: "Invoice BR-HQ-00231",
    subtitle: "Total: ৳1,250.00 · Cash · Cashier: Tanvir",
    meta: "19 Sep 2026 · 10:15 AM",
    href: "/sales",
    badge: "Paid",
  },
  {
    id: "sale-2",
    category: "sales",
    title: "Invoice BR-HQ-00230",
    subtitle: "Total: ৳3,480.00 · bKash · Customer: Md. Rahim",
    meta: "19 Sep 2026 · 09:30 AM",
    href: "/sales",
    badge: "Partial",
  },

  // Purchases
  {
    id: "pur-1",
    category: "purchases",
    title: "PO-2026-089",
    subtitle: "ABC Pharma · 24 Line Items · ৳84,200.00",
    meta: "Awaiting Delivery · Due 22 Sep",
    href: "/purchases",
    badge: "Ordered",
  },
  {
    id: "pur-2",
    category: "purchases",
    title: "PO-2026-088",
    subtitle: "Beximco Pharmaceuticals · ৳125,000.00",
    meta: "Received & Stocked · 18 Sep",
    href: "/purchases",
    badge: "Received",
  },

  // Suppliers
  {
    id: "sup-1",
    category: "suppliers",
    title: "ABC Pharma",
    subtitle: "Contact: Kamal Hossain · 01711223344",
    meta: "Outstanding: ৳42,500.00 · Terms: Net 30",
    href: "/suppliers",
    badge: "Distributor",
  },
  {
    id: "sup-2",
    category: "suppliers",
    title: "Square Pharmaceuticals Ltd.",
    subtitle: "Direct Supply Depot · Tejgaon, Dhaka",
    meta: "Outstanding: ৳0.00 · Primary Supplier",
    href: "/suppliers",
    badge: "Manufacturer",
  },
];

export function GlobalSearchCommand() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<SearchCategory>("all");

  // Global hotkey handler (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const handleCustomTrigger = () => setOpen(true);
    window.addEventListener("open-global-search", handleCustomTrigger);
    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-global-search", handleCustomTrigger);
    };
  }, []);

  const handleSelect = (item: GlobalSearchResultItem) => {
    setOpen(false);
    router.push(item.href);
  };

  const getFilteredItems = (cat: SearchCategory) => {
    if (activeCategory !== "all" && activeCategory !== cat) return [];
    return SAMPLE_SEARCH_DATA.filter((i) => i.category === cat);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Global Search"
      description="Search medicines, customers, invoices, suppliers..."
      className="max-w-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-950 p-0 overflow-hidden"
    >
      <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-3 bg-zinc-50/50 dark:bg-zinc-900/50">
        <Search className="size-4 text-zinc-400 shrink-0 mr-2" />
        <CommandInput
          placeholder="Search medicines, customers, invoices, suppliers..."
          className="h-12 border-0 bg-transparent text-sm focus-visible:ring-0 focus:outline-none placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 font-medium"
        />
        <Kbd className="text-[10px] uppercase font-mono border-zinc-200 dark:border-zinc-800 text-zinc-500">
          Esc
        </Kbd>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80 overflow-x-auto scrollbar-none bg-white dark:bg-zinc-950">
        {(
          [
            { id: "all", label: "All" },
            { id: "medicines", label: "Medicines" },
            { id: "customers", label: "Customers" },
            { id: "sales", label: "Sales" },
            { id: "purchases", label: "Purchases" },
            { id: "suppliers", label: "Suppliers" },
          ] as const
        ).map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all select-none whitespace-nowrap",
                isActive
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <CommandList className="max-h-[380px] p-2 overflow-y-auto">
        <CommandEmpty className="py-12 text-center text-xs text-zinc-500">
          No matches found across medicines, customers, sales, purchases, or suppliers.
        </CommandEmpty>

        {/* Category: Medicines */}
        {getFilteredItems("medicines").length > 0 && (
          <CommandGroup
            heading="Medicines"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-2 pt-2 pb-1"
          >
            {getFilteredItems("medicines").map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.title} ${item.subtitle} ${item.meta}`}
                onSelect={() => handleSelect(item)}
                className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80 data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                    <Pill className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-300">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{item.subtitle}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    {item.meta}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Category: Customers */}
        {getFilteredItems("customers").length > 0 && (
          <CommandGroup
            heading="Customers"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-2 pt-2 pb-1"
          >
            {getFilteredItems("customers").map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.title} ${item.subtitle} ${item.meta}`}
                onSelect={() => handleSelect(item)}
                className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80 data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                    <Users className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-300">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{item.subtitle}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    {item.meta}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Category: Sales */}
        {getFilteredItems("sales").length > 0 && (
          <CommandGroup
            heading="Sales & Invoices"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-2 pt-2 pb-1"
          >
            {getFilteredItems("sales").map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.title} ${item.subtitle} ${item.meta}`}
                onSelect={() => handleSelect(item)}
                className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80 data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                    <Receipt className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-300">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{item.subtitle}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    {item.meta}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Category: Purchases */}
        {getFilteredItems("purchases").length > 0 && (
          <CommandGroup
            heading="Purchases"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-2 pt-2 pb-1"
          >
            {getFilteredItems("purchases").map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.title} ${item.subtitle} ${item.meta}`}
                onSelect={() => handleSelect(item)}
                className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80 data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                    <Truck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-300">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{item.subtitle}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    {item.meta}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Category: Suppliers */}
        {getFilteredItems("suppliers").length > 0 && (
          <CommandGroup
            heading="Suppliers"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-2 pt-2 pb-1"
          >
            {getFilteredItems("suppliers").map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.title} ${item.subtitle} ${item.meta}`}
                onSelect={() => handleSelect(item)}
                className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80 data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-300">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{item.subtitle}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    {item.meta}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer Keyboard Navigation Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 select-none">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
            <Kbd className="size-5 p-0 flex items-center justify-center">↑</Kbd>
            <Kbd className="size-5 p-0 flex items-center justify-center">↓</Kbd>
            <span className="text-zinc-600 dark:text-zinc-400">Navigate</span>
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
            <Kbd className="px-1.5 py-0.5 text-[10px]">Enter</Kbd>
            <span className="text-zinc-600 dark:text-zinc-400">Open</span>
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
            <Kbd className="px-1.5 py-0.5 text-[10px]">Esc</Kbd>
            <span className="text-zinc-600 dark:text-zinc-400">Close</span>
          </span>
        </div>
        <div className="text-[11px] font-mono text-zinc-400">
          PharmaDaily ERP
        </div>
      </div>
    </CommandDialog>
  );
}

export function openGlobalSearch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-global-search"));
  }
}
