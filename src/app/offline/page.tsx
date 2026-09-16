import type { Metadata } from "next";
import { CloudOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
};

/**
 * Served by the service worker when a navigation fails with no connection.
 *
 * Must stay a static page with no data fetching — it has to render from the
 * precache, with no network and no session available.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <CloudOff className="size-6" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">You are offline</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          This page needs a connection. Check your internet and try again — anything already open
          keeps working, and queued sales sync once you are back online.
        </p>
      </div>
    </main>
  );
}
