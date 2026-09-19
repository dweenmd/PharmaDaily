import { Metadata } from "next";
import { SalesReturnScreen } from "@/features/sales/components/sales-return-screen";

export const metadata: Metadata = {
  title: "Sales Return & Refund | PharmaDaily",
  description: "Process customer sales returns, inventory restock, and refunds",
};

export default function SalesReturnPage() {
  return (
    <div className="container py-6 px-4 sm:px-6">
      <SalesReturnScreen />
    </div>
  );
}
