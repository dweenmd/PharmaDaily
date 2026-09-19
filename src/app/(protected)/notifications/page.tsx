import { Metadata } from "next";
import { NotificationCenter } from "@/features/notifications/components/notification-center";

export const metadata: Metadata = {
  title: "Notification Center | PharmaDaily",
  description: "Operational notifications, stock alerts, transfers, and system events",
};

export default function NotificationsPage() {
  return (
    <div className="container py-6 px-4 sm:px-6">
      <NotificationCenter />
    </div>
  );
}
