import { Metadata } from "next";
import { OfflineSyncView } from "@/features/sync/components/offline-sync-view";

export const metadata: Metadata = {
  title: "Offline & Sync | PharmaDaily",
  description: "Offline database status and synchronization queue manager",
};

export default function SyncPage() {
  return (
    <div className="container py-6 px-4 sm:px-6">
      <OfflineSyncView />
    </div>
  );
}
