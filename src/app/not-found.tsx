import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <FileQuestion className="size-6" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          This page does not exist, or you no longer have access to it.
        </p>
      </div>

      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
