"use client";

import * as React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for authenticated routes.
 *
 * Shows the digest, never the message. Next replaces server error messages
 * with a digest in production precisely so internals — table names, constraint
 * violations, connection strings — do not reach a browser. Rendering
 * `error.message` here would undo that in development habits and leak it the
 * day someone throws a raw database error.
 */
export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <TriangleAlert className="size-6" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          This screen could not be loaded. Your data is safe — nothing was changed.
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">Reference: {error.digest}</p>
        )}
      </div>

      <Button onClick={reset} variant="outline" size="sm">
        <RefreshCw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
