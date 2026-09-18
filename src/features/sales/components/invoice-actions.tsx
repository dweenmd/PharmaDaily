"use client";

import Link from "next/link";
import { Printer, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Invoice actions.
 *
 * "Download PDF" is deliberately the browser's own print dialog rather than a
 * generated file: every browser offers "Save as PDF" there, and a thermal
 * printer at the counter is driven from the same place. Bundling a PDF library
 * to reproduce what the platform already does well would add weight to a page
 * that has to load fast on a till.
 */
export function InvoiceActions({ isNewSale }: { isNewSale: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button
        onClick={() => window.print()}
        className="h-8 gap-1.5 text-xs font-semibold shadow-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
      >
        <Printer className="size-3.5" />
        Print Invoice
      </Button>

      <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
        <Link href="/pos">
          <ShoppingCart className="size-3.5" />
          New Sale
          <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-bold">F2</span>
        </Link>
      </Button>
    </div>
  );
}
