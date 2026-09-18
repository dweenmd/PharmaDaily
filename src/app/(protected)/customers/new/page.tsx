import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewCustomerForm } from "@/features/customers/components/new-customer-form";

export const metadata: Metadata = {
  title: "New Customer",
};

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-xs">
          <Link href="/customers">
            <ArrowLeft className="size-4 mr-1" />
            Back to Customers
          </Link>
        </Button>
      </div>

      <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-6 shadow-sm">
        <CardContent className="p-0">
          <NewCustomerForm />
        </CardContent>
      </Card>
    </div>
  );
}
