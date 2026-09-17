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
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button onClick={() => window.print()}>
        <Printer className="size-4" />
        Print / Save PDF
      </Button>

      <Button asChild variant={isNewSale ? "default" : "outline"}>
        <Link href="/pos">
          <ShoppingCart className="size-4" />
          New Sale
        </Link>
      </Button>
    </div>
  );
}
