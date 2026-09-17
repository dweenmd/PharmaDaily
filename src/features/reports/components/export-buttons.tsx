"use client";

import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  filename: string;
  /** Header row, then data rows. Values are stringified as given. */
  rows: (string | number)[][];
};

/**
 * Escapes one CSV field.
 *
 * The leading-character guard is the important part: Excel and Sheets treat a
 * field starting with =, +, - or @ as a formula. A medicine or customer name
 * beginning with one of those would execute on open — CSV injection, and a real
 * way to attack whoever opens the export rather than the app itself. Prefixing
 * a single quote makes it inert text.
 */
function escapeField(value: string | number): string {
  const text = String(value ?? "");
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function ExportButtons({ filename, rows }: Props) {
  function downloadCsv() {
    if (rows.length <= 1) {
      toast.error("Nothing to export", { description: "This report has no rows." });
      return;
    }

    const csv = rows.map((row) => row.map(escapeField).join(",")).join("\r\n");

    // The BOM makes Excel open UTF-8 correctly; without it Bengali names and
    // the taka sign arrive as mojibake.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Export downloaded", { description: `${rows.length - 1} rows.` });
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={downloadCsv}>
        <Download className="size-4" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" />
        Print / PDF
      </Button>
    </div>
  );
}
