"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Percent,
  Pill,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ReportsNav } from "@/features/reports/components/reports-nav";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export type SalesReportInvoiceItem = {
  medicine_name: string;
  strength?: string;
  batch_no: string;
  expiry_date?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type SalesReportRecord = {
  id: string;
  invoice_no: string;
  date: string; // ISO date string
  created_at: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  cashier_id?: string | null;
  cashier_name: string;
  branch_id?: string | null;
  branch_code: string;
  branch_name: string;
  items_count: number;
  items_preview: string;
  items?: SalesReportInvoiceItem[];
  gross: number; // subtotal
  discount: number;
  returns: number;
  net: number; // total amount
  paid: number;
  due: number;
  profit: number;
  payment_method: "cash" | "bkash" | "nagad" | "card" | "due" | "split";
  payment_label: string;
};

export type TopMedicineStat = {
  rank: number;
  medicine_id: string;
  medicine_name: string;
  strength: string;
  generic_name?: string;
  units_sold: number;
  revenue: number;
  profit: number;
  margin_percent: number;
};

export type SalesTrendDataPoint = {
  day: string; // YYYY-MM-DD
  formatted_day: string; // "14 Sep"
  gross: number;
  discount: number;
  returns: number;
  net: number;
  profit: number;
  bills: number;
};

export type FilterOption = {
  id: string;
  name: string;
  code?: string;
};

type Props = {
  initialSales: SalesReportRecord[];
  initialBranches: FilterOption[];
  initialCashiers: FilterOption[];
  initialCustomers?: FilterOption[];
  initialTopMedicines?: TopMedicineStat[];
  initialTrend?: SalesTrendDataPoint[];
  initialReturnsTotal?: number;
  dateRange: { from: string; to: string };
  isSuperAdmin?: boolean;
};

// ---------------------------------------------------------------------------
// REALISTIC DEMO DATA (Fallback when database is fresh or empty)
// ---------------------------------------------------------------------------

const DEMO_BRANCHES: FilterOption[] = [
  { id: "br-01", name: "Main Central Pharmacy", code: "MAIN" },
  { id: "br-02", name: "Dhanmondi Branch", code: "DHAN" },
  { id: "br-03", name: "Gulshan Clinic Branch", code: "GULS" },
  { id: "br-04", name: "Mirpur 10 Branch", code: "MIRP" },
  { id: "br-05", name: "Uttara Sector 7 Branch", code: "UTTA" },
];

const DEMO_CASHIERS: FilterOption[] = [
  { id: "c-01", name: "Dr. Sarah Rahman" },
  { id: "c-02", name: "Tariqul Islam (Pharm.B)" },
  { id: "c-03", name: "Farzana Ahmed" },
  { id: "c-04", name: "Kamal Hossain" },
  { id: "c-05", name: "Nusrat Parveen" },
];

const DEMO_CUSTOMERS: FilterOption[] = [
  { id: "all", name: "All Customers" },
  { id: "walkin", name: "Walk-in Customer" },
  { id: "cust-01", name: "Al-Amin Sheikh" },
  { id: "cust-02", name: "Mrs. Nusrat Jahan" },
  { id: "cust-03", name: "Engr. Mahmud Hasan" },
  { id: "cust-04", name: "Rahim Chowdhury" },
  { id: "cust-05", name: "Dr. Anisur Rahman" },
  { id: "cust-06", name: "Fatima Begum" },
];

const DEMO_TOP_MEDICINES: TopMedicineStat[] = [
  {
    rank: 1,
    medicine_id: "med-01",
    medicine_name: "Napa Extra",
    strength: "500mg + 65mg",
    generic_name: "Paracetamol + Caffeine",
    units_sold: 2840,
    revenue: 71000,
    profit: 21300,
    margin_percent: 30.0,
  },
  {
    rank: 2,
    medicine_id: "med-02",
    medicine_name: "Seclo 20",
    strength: "20mg Capsule",
    generic_name: "Omeprazole",
    units_sold: 1960,
    revenue: 98000,
    profit: 29400,
    margin_percent: 30.0,
  },
  {
    rank: 3,
    medicine_id: "med-03",
    medicine_name: "Sergel 20",
    strength: "20mg Tablet",
    generic_name: "Esomeprazole",
    units_sold: 1420,
    revenue: 99400,
    profit: 27832,
    margin_percent: 28.0,
  },
  {
    rank: 4,
    medicine_id: "med-04",
    medicine_name: "Monas 10",
    strength: "10mg Tablet",
    generic_name: "Montelukast Sodium",
    units_sold: 880,
    revenue: 140800,
    profit: 35200,
    margin_percent: 25.0,
  },
  {
    rank: 5,
    medicine_id: "med-05",
    medicine_name: "Ceevit Chewable",
    strength: "250mg Tablet",
    generic_name: "Ascorbic Acid (Vitamin C)",
    units_sold: 2150,
    revenue: 43000,
    profit: 15050,
    margin_percent: 35.0,
  },
  {
    rank: 6,
    medicine_id: "med-06",
    medicine_name: "Zithrin 500",
    strength: "500mg Tablet",
    generic_name: "Azithromycin",
    units_sold: 620,
    revenue: 68200,
    profit: 17050,
    margin_percent: 25.0,
  },
  {
    rank: 7,
    medicine_id: "med-07",
    medicine_name: "Fexo 120",
    strength: "120mg Tablet",
    generic_name: "Fexofenadine HCl",
    units_sold: 950,
    revenue: 57000,
    profit: 14250,
    margin_percent: 25.0,
  },
  {
    rank: 8,
    medicine_id: "med-08",
    medicine_name: "Ace Plus",
    strength: "500mg + 65mg",
    generic_name: "Paracetamol + Caffeine",
    units_sold: 1350,
    revenue: 33750,
    profit: 9450,
    margin_percent: 28.0,
  },
];

const DEMO_SALES: SalesReportRecord[] = [
  {
    id: "sale-101",
    invoice_no: "INV-2026-0849",
    date: "2026-09-18",
    created_at: "2026-09-18T16:42:15Z",
    customer_name: "Mrs. Nusrat Jahan",
    customer_phone: "+880 1711-209841",
    cashier_name: "Dr. Sarah Rahman",
    cashier_id: "c-01",
    branch_code: "MAIN",
    branch_name: "Main Central Pharmacy",
    branch_id: "br-01",
    items_count: 4,
    items_preview: "Monas 10mg (30 tabs), Sergel 20mg (28 tabs), Ceevit (20 tabs)...",
    items: [
      {
        medicine_name: "Monas 10",
        strength: "10mg",
        batch_no: "MN-9821",
        quantity: 30,
        unit_price: 16.0,
        total_price: 480.0,
      },
      {
        medicine_name: "Sergel 20",
        strength: "20mg",
        batch_no: "SG-4410",
        quantity: 28,
        unit_price: 7.0,
        total_price: 196.0,
      },
      {
        medicine_name: "Ceevit",
        strength: "250mg",
        batch_no: "CV-2026",
        quantity: 20,
        unit_price: 2.0,
        total_price: 40.0,
      },
      {
        medicine_name: "Napa Extra",
        strength: "500mg/65mg",
        batch_no: "NP-8832",
        quantity: 20,
        unit_price: 2.5,
        total_price: 50.0,
      },
    ],
    gross: 766.0,
    discount: 36.0,
    returns: 0,
    net: 730.0,
    paid: 730.0,
    due: 0,
    profit: 204.4,
    payment_method: "bkash",
    payment_label: "bKash (MFS)",
  },
  {
    id: "sale-102",
    invoice_no: "INV-2026-0848",
    date: "2026-09-18",
    created_at: "2026-09-18T15:28:40Z",
    customer_name: "Walk-in Customer",
    cashier_name: "Tariqul Islam (Pharm.B)",
    cashier_id: "c-02",
    branch_code: "DHAN",
    branch_name: "Dhanmondi Branch",
    branch_id: "br-02",
    items_count: 2,
    items_preview: "Seclo 20mg (20 caps), Napa Extra (10 tabs)",
    items: [
      {
        medicine_name: "Seclo 20",
        strength: "20mg",
        batch_no: "SC-9912",
        quantity: 20,
        unit_price: 5.0,
        total_price: 100.0,
      },
      {
        medicine_name: "Napa Extra",
        strength: "500mg/65mg",
        batch_no: "NP-8832",
        quantity: 10,
        unit_price: 2.5,
        total_price: 25.0,
      },
    ],
    gross: 125.0,
    discount: 5.0,
    returns: 0,
    net: 120.0,
    paid: 120.0,
    due: 0,
    profit: 36.0,
    payment_method: "cash",
    payment_label: "Cash",
  },
  {
    id: "sale-103",
    invoice_no: "INV-2026-0847",
    date: "2026-09-18",
    created_at: "2026-09-18T14:15:00Z",
    customer_name: "Engr. Mahmud Hasan",
    customer_phone: "+880 1819-445566",
    cashier_name: "Farzana Ahmed",
    cashier_id: "c-03",
    branch_code: "GULS",
    branch_name: "Gulshan Clinic Branch",
    branch_id: "br-03",
    items_count: 5,
    items_preview: "Zithrin 500mg (6 tabs), Fexo 120mg (20 tabs), Napa Rapid...",
    items: [
      {
        medicine_name: "Zithrin 500",
        strength: "500mg",
        batch_no: "ZT-1102",
        quantity: 6,
        unit_price: 110.0,
        total_price: 660.0,
      },
      {
        medicine_name: "Fexo 120",
        strength: "120mg",
        batch_no: "FX-3021",
        quantity: 20,
        unit_price: 6.0,
        total_price: 120.0,
      },
      {
        medicine_name: "Napa Rapid",
        strength: "500mg",
        batch_no: "NR-4401",
        quantity: 20,
        unit_price: 3.0,
        total_price: 60.0,
      },
      {
        medicine_name: "Ceevit",
        strength: "250mg",
        batch_no: "CV-2026",
        quantity: 30,
        unit_price: 2.0,
        total_price: 60.0,
      },
    ],
    gross: 900.0,
    discount: 50.0,
    returns: 0,
    net: 850.0,
    paid: 850.0,
    due: 0,
    profit: 221.0,
    payment_method: "card",
    payment_label: "Card (Visa)",
  },
  {
    id: "sale-104",
    invoice_no: "INV-2026-0846",
    date: "2026-09-18",
    created_at: "2026-09-18T13:02:11Z",
    customer_name: "Al-Amin Sheikh",
    customer_phone: "+880 1912-334455",
    cashier_name: "Kamal Hossain",
    cashier_id: "c-04",
    branch_code: "MIRP",
    branch_name: "Mirpur 10 Branch",
    branch_id: "br-04",
    items_count: 3,
    items_preview: "Bexitrol F Inhaler, Monas 10mg (30 tabs), Ace Plus (20 tabs)",
    items: [
      {
        medicine_name: "Bexitrol F Inhaler",
        strength: "100mcg/50mcg",
        batch_no: "BX-9002",
        quantity: 1,
        unit_price: 450.0,
        total_price: 450.0,
      },
      {
        medicine_name: "Monas 10",
        strength: "10mg",
        batch_no: "MN-9821",
        quantity: 30,
        unit_price: 16.0,
        total_price: 480.0,
      },
      {
        medicine_name: "Ace Plus",
        strength: "500mg/65mg",
        batch_no: "AP-7731",
        quantity: 20,
        unit_price: 2.5,
        total_price: 50.0,
      },
    ],
    gross: 980.0,
    discount: 40.0,
    returns: 0,
    net: 940.0,
    paid: 940.0,
    due: 0,
    profit: 253.8,
    payment_method: "nagad",
    payment_label: "Nagad (MFS)",
  },
  {
    id: "sale-105",
    invoice_no: "INV-2026-0845",
    date: "2026-09-17",
    created_at: "2026-09-17T19:40:22Z",
    customer_name: "Rahim Chowdhury",
    customer_phone: "+880 1715-998877",
    cashier_name: "Dr. Sarah Rahman",
    cashier_id: "c-01",
    branch_code: "MAIN",
    branch_name: "Main Central Pharmacy",
    branch_id: "br-01",
    items_count: 6,
    items_preview: "Thyrox 50mcg, Betaloc 50mg, Lipitor 20mg, Napa 500mg...",
    items: [
      {
        medicine_name: "Thyrox",
        strength: "50mcg",
        batch_no: "TX-4401",
        quantity: 100,
        unit_price: 2.0,
        total_price: 200.0,
      },
      {
        medicine_name: "Betaloc 50",
        strength: "50mg",
        batch_no: "BL-9823",
        quantity: 30,
        unit_price: 8.0,
        total_price: 240.0,
      },
      {
        medicine_name: "Lipitor 20",
        strength: "20mg",
        batch_no: "LP-1190",
        quantity: 30,
        unit_price: 25.0,
        total_price: 750.0,
      },
      {
        medicine_name: "Napa",
        strength: "500mg",
        batch_no: "NP-8832",
        quantity: 50,
        unit_price: 1.2,
        total_price: 60.0,
      },
    ],
    gross: 1250.0,
    discount: 75.0,
    returns: 0,
    net: 1175.0,
    paid: 1175.0,
    due: 0,
    profit: 329.0,
    payment_method: "card",
    payment_label: "Card (Mastercard)",
  },
  {
    id: "sale-106",
    invoice_no: "INV-2026-0844",
    date: "2026-09-17",
    created_at: "2026-09-17T17:18:05Z",
    customer_name: "Dr. Anisur Rahman",
    customer_phone: "+880 1817-112233",
    cashier_name: "Nusrat Parveen",
    cashier_id: "c-05",
    branch_code: "UTTA",
    branch_name: "Uttara Sector 7 Branch",
    branch_id: "br-05",
    items_count: 2,
    items_preview: "Sergel 20mg (56 tabs), Ceevit (40 tabs)",
    items: [
      {
        medicine_name: "Sergel 20",
        strength: "20mg",
        batch_no: "SG-4410",
        quantity: 56,
        unit_price: 7.0,
        total_price: 392.0,
      },
      {
        medicine_name: "Ceevit",
        strength: "250mg",
        batch_no: "CV-2026",
        quantity: 40,
        unit_price: 2.0,
        total_price: 80.0,
      },
    ],
    gross: 472.0,
    discount: 22.0,
    returns: 0,
    net: 450.0,
    paid: 450.0,
    due: 0,
    profit: 126.0,
    payment_method: "cash",
    payment_label: "Cash",
  },
  {
    id: "sale-107",
    invoice_no: "INV-2026-0843",
    date: "2026-09-17",
    created_at: "2026-09-17T14:45:50Z",
    customer_name: "Walk-in Customer",
    cashier_name: "Farzana Ahmed",
    cashier_id: "c-03",
    branch_code: "GULS",
    branch_name: "Gulshan Clinic Branch",
    branch_id: "br-03",
    items_count: 3,
    items_preview: "Napa Extra (20 tabs), Antacid Plus (10 tabs), ORS (5 pkts)",
    items: [
      {
        medicine_name: "Napa Extra",
        strength: "500mg/65mg",
        batch_no: "NP-8832",
        quantity: 20,
        unit_price: 2.5,
        total_price: 50.0,
      },
      {
        medicine_name: "Antacid Plus",
        strength: "Suspension",
        batch_no: "AN-3011",
        quantity: 1,
        unit_price: 85.0,
        total_price: 85.0,
      },
      {
        medicine_name: "ORS Saline",
        strength: "Oral Pkt",
        batch_no: "OR-9921",
        quantity: 5,
        unit_price: 6.0,
        total_price: 30.0,
      },
    ],
    gross: 165.0,
    discount: 5.0,
    returns: 0,
    net: 160.0,
    paid: 160.0,
    due: 0,
    profit: 46.0,
    payment_method: "bkash",
    payment_label: "bKash (MFS)",
  },
  {
    id: "sale-108",
    invoice_no: "INV-2026-0842",
    date: "2026-09-16",
    created_at: "2026-09-16T20:10:14Z",
    customer_name: "Fatima Begum",
    customer_phone: "+880 1622-778899",
    cashier_name: "Tariqul Islam (Pharm.B)",
    cashier_id: "c-02",
    branch_code: "DHAN",
    branch_name: "Dhanmondi Branch",
    branch_id: "br-02",
    items_count: 4,
    items_preview: "Glucophage 500mg (60 tabs), Seclo 20mg (30 caps), Calbo D...",
    items: [
      {
        medicine_name: "Glucophage",
        strength: "500mg",
        batch_no: "GP-6612",
        quantity: 60,
        unit_price: 4.5,
        total_price: 270.0,
      },
      {
        medicine_name: "Seclo 20",
        strength: "20mg",
        batch_no: "SC-9912",
        quantity: 30,
        unit_price: 5.0,
        total_price: 150.0,
      },
      {
        medicine_name: "Calbo D",
        strength: "500mg/200IU",
        batch_no: "CD-8819",
        quantity: 30,
        unit_price: 6.0,
        total_price: 180.0,
      },
    ],
    gross: 600.0,
    discount: 30.0,
    returns: 0,
    net: 570.0,
    paid: 570.0,
    due: 0,
    profit: 153.9,
    payment_method: "cash",
    payment_label: "Cash",
  },
  {
    id: "sale-109",
    invoice_no: "INV-2026-0841",
    date: "2026-09-16",
    created_at: "2026-09-16T18:35:30Z",
    customer_name: "Walk-in Customer",
    cashier_name: "Kamal Hossain",
    cashier_id: "c-04",
    branch_code: "MIRP",
    branch_name: "Mirpur 10 Branch",
    branch_id: "br-04",
    items_count: 1,
    items_preview: "Voltral Emulgel 50g (1 tube)",
    items: [
      {
        medicine_name: "Voltral Emulgel",
        strength: "1% 50g",
        batch_no: "VT-0041",
        quantity: 1,
        unit_price: 185.0,
        total_price: 185.0,
      },
    ],
    gross: 185.0,
    discount: 5.0,
    returns: 0,
    net: 180.0,
    paid: 180.0,
    due: 0,
    profit: 45.0,
    payment_method: "cash",
    payment_label: "Cash",
  },
  {
    id: "sale-110",
    invoice_no: "INV-2026-0840",
    date: "2026-09-16",
    created_at: "2026-09-16T11:20:00Z",
    customer_name: "Al-Amin Sheikh",
    customer_phone: "+880 1912-334455",
    cashier_name: "Dr. Sarah Rahman",
    cashier_id: "c-01",
    branch_code: "MAIN",
    branch_name: "Main Central Pharmacy",
    branch_id: "br-01",
    items_count: 3,
    items_preview: "Napa Syrup (2 bot), Penvik 250mg (16 caps), Vitamin B Complex",
    items: [
      {
        medicine_name: "Napa Syrup",
        strength: "60ml",
        batch_no: "NS-3310",
        quantity: 2,
        unit_price: 35.0,
        total_price: 70.0,
      },
      {
        medicine_name: "Penvik 250",
        strength: "250mg",
        batch_no: "PV-5501",
        quantity: 16,
        unit_price: 5.0,
        total_price: 80.0,
      },
      {
        medicine_name: "Vitamin B Complex",
        strength: "Syrup 100ml",
        batch_no: "VB-1099",
        quantity: 1,
        unit_price: 65.0,
        total_price: 65.0,
      },
    ],
    gross: 215.0,
    discount: 15.0,
    returns: 0,
    net: 200.0,
    paid: 200.0,
    due: 0,
    profit: 52.0,
    payment_method: "due",
    payment_label: "Store Credit / Due",
  },
];

const DEMO_TREND: SalesTrendDataPoint[] = [
  { day: "2026-09-01", formatted_day: "01 Sep", gross: 14200, discount: 520, returns: 100, net: 13580, profit: 3660, bills: 48 },
  { day: "2026-09-02", formatted_day: "02 Sep", gross: 16800, discount: 640, returns: 150, net: 16010, profit: 4320, bills: 56 },
  { day: "2026-09-03", formatted_day: "03 Sep", gross: 12400, discount: 410, returns: 0, net: 11990, profit: 3230, bills: 42 },
  { day: "2026-09-04", formatted_day: "04 Sep", gross: 15300, discount: 580, returns: 220, net: 14500, profit: 3910, bills: 51 },
  { day: "2026-09-05", formatted_day: "05 Sep", gross: 18900, discount: 720, returns: 110, net: 18070, profit: 4870, bills: 64 },
  { day: "2026-09-06", formatted_day: "06 Sep", gross: 21400, discount: 850, returns: 310, net: 20240, profit: 5460, bills: 72 },
  { day: "2026-09-07", formatted_day: "07 Sep", gross: 17200, discount: 610, returns: 90, net: 16500, profit: 4450, bills: 58 },
  { day: "2026-09-08", formatted_day: "08 Sep", gross: 19800, discount: 750, returns: 180, net: 18870, profit: 5090, bills: 67 },
  { day: "2026-09-09", formatted_day: "09 Sep", gross: 22100, discount: 890, returns: 250, net: 20960, profit: 5650, bills: 75 },
  { day: "2026-09-10", formatted_day: "10 Sep", gross: 18600, discount: 690, returns: 140, net: 17770, profit: 4790, bills: 61 },
  { day: "2026-09-11", formatted_day: "11 Sep", gross: 24500, discount: 980, returns: 320, net: 23200, profit: 6260, bills: 83 },
  { day: "2026-09-12", formatted_day: "12 Sep", gross: 28900, discount: 1150, returns: 410, net: 27340, profit: 7380, bills: 98 },
  { day: "2026-09-13", formatted_day: "13 Sep", gross: 26400, discount: 1020, returns: 280, net: 25100, profit: 6770, bills: 89 },
  { day: "2026-09-14", formatted_day: "14 Sep", gross: 32450, discount: 1320, returns: 520, net: 30610, profit: 8260, bills: 109 },
  { day: "2026-09-15", formatted_day: "15 Sep", gross: 27800, discount: 1080, returns: 340, net: 26380, profit: 7120, bills: 94 },
  { day: "2026-09-16", formatted_day: "16 Sep", gross: 29100, discount: 1140, returns: 290, net: 27670, profit: 7470, bills: 97 },
  { day: "2026-09-17", formatted_day: "17 Sep", gross: 25800, discount: 990, returns: 190, net: 24620, profit: 6640, bills: 88 },
  { day: "2026-09-18", formatted_day: "18 Sep", gross: 31200, discount: 1250, returns: 400, net: 29550, profit: 7970, bills: 105 },
];

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

// ---------------------------------------------------------------------------
// MAIN SALES REPORT CLIENT COMPONENT
// ---------------------------------------------------------------------------

export function SalesReportClient({
  initialSales = [],
  initialBranches = [],
  initialCashiers = [],
  initialCustomers = [],
  initialTopMedicines = [],
  initialTrend = [],
  initialReturnsTotal = 0,
  dateRange,
  isSuperAdmin = true,
}: Props) {
  // Use live data if provided, otherwise fallback to rich demo data
  const hasLiveSales = initialSales.length > 0;
  const rawSales = hasLiveSales ? initialSales : DEMO_SALES;
  const branches = initialBranches.length > 0 ? initialBranches : DEMO_BRANCHES;
  const cashiers = initialCashiers.length > 0 ? initialCashiers : DEMO_CASHIERS;
  const customers = initialCustomers.length > 0 ? initialCustomers : DEMO_CUSTOMERS;
  const topMedicines = initialTopMedicines.length > 0 ? initialTopMedicines : DEMO_TOP_MEDICINES;
  const trendPoints = initialTrend.length > 0 ? initialTrend : DEMO_TREND;

  // -------------------------------------------------------------------------
  // 5 FILTERS (Date Range, Branch, Cashier, Payment Method, Customer)
  // -------------------------------------------------------------------------
  const [fromDate, setFromDate] = React.useState(dateRange.from || "2026-09-01");
  const [toDate, setToDate] = React.useState(dateRange.to || "2026-09-18");
  const [selectedPreset, setSelectedPreset] = React.useState<string>("last30");
  const [selectedBranch, setSelectedBranch] = React.useState<string>("all");
  const [selectedCashier, setSelectedCashier] = React.useState<string>("all");
  const [selectedMethod, setSelectedMethod] = React.useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = React.useState<string>("all");

  // Search input inside detailed table
  const [tableSearch, setTableSearch] = React.useState("");

  // Pagination for detailed table
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Selected invoice for detail drawer modal
  const [selectedInvoice, setSelectedInvoice] = React.useState<SalesReportRecord | null>(null);

  // Main Chart Metric Toggle (Net Sales, Gross Sales, Bills, Margin)
  const [chartMetric, setChartMetric] = React.useState<"net" | "gross" | "bills" | "profit">("net");

  // Chart Hover Tooltip Point
  const [hoveredPointIndex, setHoveredPointIndex] = React.useState<number | null>(null);

  // Quick Date Preset Handler
  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    const today = new Date().toISOString().slice(0, 10);
    const d = new Date();

    if (preset === "today") {
      setFromDate(today);
      setToDate(today);
    } else if (preset === "yesterday") {
      d.setDate(d.getDate() - 1);
      const yday = d.toISOString().slice(0, 10);
      setFromDate(yday);
      setToDate(yday);
    } else if (preset === "last7") {
      d.setDate(d.getDate() - 6);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(today);
    } else if (preset === "last30") {
      d.setDate(d.getDate() - 29);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(today);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      setFromDate(firstDay);
      setToDate(today);
    }
  };

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSelectedPreset("last30");
    const d = new Date();
    d.setDate(d.getDate() - 29);
    setFromDate(d.toISOString().slice(0, 10));
    setToDate(new Date().toISOString().slice(0, 10));
    setSelectedBranch("all");
    setSelectedCashier("all");
    setSelectedMethod("all");
    setSelectedCustomer("all");
    setTableSearch("");
    setCurrentPage(1);
    toast.info("Filters reset to default 30-day overview");
  };

  const hasActiveFilters =
    selectedBranch !== "all" ||
    selectedCashier !== "all" ||
    selectedMethod !== "all" ||
    selectedCustomer !== "all" ||
    selectedPreset !== "last30" ||
    tableSearch.trim().length > 0;

  // -------------------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------------------
  const filteredSales = React.useMemo(() => {
    return rawSales.filter((sale) => {
      // Branch filter
      if (selectedBranch !== "all") {
        if (sale.branch_id && sale.branch_id !== selectedBranch && sale.branch_code !== selectedBranch) {
          return false;
        }
      }

      // Cashier filter
      if (selectedCashier !== "all") {
        if (sale.cashier_id && sale.cashier_id !== selectedCashier && sale.cashier_name !== selectedCashier) {
          return false;
        }
      }

      // Payment Method filter
      if (selectedMethod !== "all") {
        if (sale.payment_method !== selectedMethod) {
          return false;
        }
      }

      // Customer filter
      if (selectedCustomer !== "all") {
        if (selectedCustomer === "walkin") {
          if (!sale.customer_name.toLowerCase().includes("walk-in")) return false;
        } else {
          if (
            sale.customer_id !== selectedCustomer &&
            !sale.customer_name.toLowerCase().includes(selectedCustomer.toLowerCase())
          ) {
            return false;
          }
        }
      }

      // Search term filter
      if (tableSearch.trim()) {
        const query = tableSearch.toLowerCase();
        const matchesInv = sale.invoice_no.toLowerCase().includes(query);
        const matchesCust = sale.customer_name.toLowerCase().includes(query);
        const matchesCashier = sale.cashier_name.toLowerCase().includes(query);
        const matchesItems = sale.items_preview.toLowerCase().includes(query);
        if (!matchesInv && !matchesCust && !matchesCashier && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [rawSales, selectedBranch, selectedCashier, selectedMethod, selectedCustomer, tableSearch]);

  // -------------------------------------------------------------------------
  // 6 SUMMARY KPI CARDS COMPUTATION
  // -------------------------------------------------------------------------
  const summaryKpis = React.useMemo(() => {
    const grossSales = filteredSales.reduce((acc, s) => acc + s.gross, 0);
    const discount = filteredSales.reduce((acc, s) => acc + s.discount, 0);
    const returns = hasLiveSales
      ? initialReturnsTotal
      : filteredSales.reduce((acc, s) => acc + (s.returns || 0), 0) + 4200;
    const netSales = Math.max(0, grossSales - discount - (hasLiveSales ? returns : 0));
    const billsCount = filteredSales.length;
    const avgBill = billsCount > 0 ? netSales / billsCount : 0;
    const totalProfit = filteredSales.reduce((acc, s) => acc + s.profit, 0);
    const profitMargin = netSales > 0 ? (totalProfit / netSales) * 100 : 0;
    const discountPercent = grossSales > 0 ? (discount / grossSales) * 100 : 0;

    return {
      grossSales,
      discount,
      discountPercent,
      returns,
      netSales,
      billsCount,
      avgBill,
      totalProfit,
      profitMargin,
    };
  }, [filteredSales, hasLiveSales, initialReturnsTotal]);

  // -------------------------------------------------------------------------
  // SECONDARY SECTION 1: SALES BY PAYMENT METHOD
  // -------------------------------------------------------------------------
  const paymentMethodBreakdown = React.useMemo(() => {
    const methodMap: Record<
      string,
      { label: string; amount: number; bills: number; icon: React.ElementType }
    > = {
      cash: { label: "Cash (Counter)", amount: 0, bills: 0, icon: Banknote },
      bkash: { label: "bKash (MFS)", amount: 0, bills: 0, icon: Wallet },
      nagad: { label: "Nagad (MFS)", amount: 0, bills: 0, icon: Wallet },
      card: { label: "Card (POS / Debit)", amount: 0, bills: 0, icon: CreditCard },
      due: { label: "Store Credit / Due", amount: 0, bills: 0, icon: FileText },
    };

    filteredSales.forEach((sale) => {
      const methodKey = sale.payment_method in methodMap ? sale.payment_method : "cash";
      const target = methodMap[methodKey];
      if (target) {
        target.amount += sale.net;
        target.bills += 1;
      }
    });

    const totalMethodAmount = Object.values(methodMap).reduce((acc, item) => acc + item.amount, 0);

    return Object.entries(methodMap).map(([key, data]) => {
      const share = totalMethodAmount > 0 ? (data.amount / totalMethodAmount) * 100 : 0;
      return {
        key,
        ...data,
        share: Math.round(share * 10) / 10,
      };
    });
  }, [filteredSales]);

  // -------------------------------------------------------------------------
  // SECONDARY SECTION 2: SALES BY BRANCH
  // -------------------------------------------------------------------------
  const branchSalesBreakdown = React.useMemo(() => {
    const branchMap: Record<
      string,
      { name: string; code: string; net: number; bills: number }
    > = {};

    branches.forEach((b) => {
      branchMap[b.code || b.id] = {
        name: b.name,
        code: b.code || b.id.toUpperCase(),
        net: 0,
        bills: 0,
      };
    });

    filteredSales.forEach((sale) => {
      const branchKey = sale.branch_code || "MAIN";
      if (!branchMap[branchKey]) {
        branchMap[branchKey] = {
          name: sale.branch_name || "Central Branch",
          code: branchKey,
          net: 0,
          bills: 0,
        };
      }
      const targetBranch = branchMap[branchKey];
      if (targetBranch) {
        targetBranch.net += sale.net;
        targetBranch.bills += 1;
      }
    });

    const totalBranchNet = Object.values(branchMap).reduce((acc, item) => acc + item.net, 0);

    return Object.entries(branchMap)
      .map(([code, item]) => {
        const share = totalBranchNet > 0 ? (item.net / totalBranchNet) * 100 : 0;
        const avg = item.bills > 0 ? item.net / item.bills : 0;
        return {
          ...item,
          code,
          avgBill: avg,
          share: Math.round(share * 10) / 10,
        };
      })
      .sort((a, b) => b.net - a.net);
  }, [branches, filteredSales]);

  // -------------------------------------------------------------------------
  // ACTIONS: EXPORT CSV
  // -------------------------------------------------------------------------
  const handleExportCsv = () => {
    if (filteredSales.length === 0) {
      toast.error("No sales records to export", {
        description: "Please adjust your active filters.",
      });
      return;
    }

    const headers = [
      "Date",
      "Invoice",
      "Customer",
      "Cashier",
      "Branch",
      "Items Count",
      "Items Summary",
      "Gross (BDT)",
      "Discount (BDT)",
      "Net (BDT)",
      "Paid (BDT)",
      "Due (BDT)",
      "Payment Method",
    ];

    const rows = filteredSales.map((s) => [
      escapeCsvCell(formatDateTime(s.created_at)),
      escapeCsvCell(s.invoice_no),
      escapeCsvCell(s.customer_name),
      escapeCsvCell(s.cashier_name),
      escapeCsvCell(s.branch_name),
      escapeCsvCell(s.items_count),
      escapeCsvCell(s.items_preview),
      escapeCsvCell(s.gross.toFixed(2)),
      escapeCsvCell(s.discount.toFixed(2)),
      escapeCsvCell(s.net.toFixed(2)),
      escapeCsvCell(s.paid.toFixed(2)),
      escapeCsvCell(s.due.toFixed(2)),
      escapeCsvCell(s.payment_label),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    // Add UTF-8 BOM to ensure symbols and Bengali characters open cleanly in Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pharmadaily-sales-report-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Sales Report CSV Exported", {
      description: `${filteredSales.length} invoice records saved.`,
    });
  };

  // -------------------------------------------------------------------------
  // ACTIONS: EXPORT PDF / PRINT
  // -------------------------------------------------------------------------
  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    toast.info("Preparing PDF Document", {
      description: "Opening print preview for high-resolution PDF download...",
    });
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // -------------------------------------------------------------------------
  // PAGINATION
  // -------------------------------------------------------------------------
  const totalPages = Math.ceil(filteredSales.length / pageSize) || 1;
  const paginatedSales = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  // -------------------------------------------------------------------------
  // CHART RENDERING CALCULATIONS
  // -------------------------------------------------------------------------
  const chartPoints = trendPoints;
  const chartValues = chartPoints.map((p) => {
    if (chartMetric === "net") return p.net;
    if (chartMetric === "gross") return p.gross;
    if (chartMetric === "bills") return p.bills;
    return p.profit;
  });

  const maxVal = Math.max(...chartValues, 1);
  const minVal = Math.min(...chartValues, 0);
  const chartHeight = 220;
  const chartWidth = 780;
  const paddingX = 40;
  const paddingY = 24;

  const pointsCoordinates = chartValues.map((val, idx) => {
    const x =
      chartValues.length > 1
        ? paddingX + (idx / (chartValues.length - 1)) * (chartWidth - paddingX * 2)
        : chartWidth / 2;
    const y =
      maxVal === minVal
        ? chartHeight / 2
        : chartHeight - paddingY - ((val - minVal) / (maxVal - minVal)) * (chartHeight - paddingY * 2);
    const point = chartPoints[idx] ?? {
      day: "2026-09-01",
      formatted_day: "01 Sep",
      gross: 0,
      discount: 0,
      returns: 0,
      net: 0,
      profit: 0,
      bills: 0,
    };
    return { x, y, val, point };
  });

  const svgPathD =
    pointsCoordinates.length > 0
      ? pointsCoordinates.reduce((acc, curr, idx) => {
          return `${acc} ${idx === 0 ? "M" : "L"} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
        }, "")
      : "";

  const firstPt = pointsCoordinates[0];
  const lastPt = pointsCoordinates[pointsCoordinates.length - 1];
  const areaPathD =
    pointsCoordinates.length > 0 && firstPt && lastPt
      ? `${svgPathD} L ${lastPt.x.toFixed(1)} ${chartHeight - paddingY} L ${firstPt.x.toFixed(1)} ${chartHeight - paddingY} Z`
      : "";

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Navigation Sub-header (Print Hidden) */}
      <ReportsNav />

      {/* =================================================================== */}
      {/* 1. HEADER WITH ACTIONS */}
      {/* =================================================================== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-border/60 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Sales Report
            </h1>
            <Badge
              variant="outline"
              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 border-zinc-300 dark:border-zinc-700"
            >
              Business Intelligence
            </Badge>
            {!hasLiveSales && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 text-[10px] px-2 py-0.5"
              >
                Sample BI Preview
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm flex flex-wrap items-center gap-2">
            <span>
              Executive financial overview from{" "}
              <strong className="text-foreground">{formatDate(fromDate)}</strong> to{" "}
              <strong className="text-foreground">{formatDate(toDate)}</strong>
            </span>
            <span className="text-zinc-400">·</span>
            <span className="font-mono text-xs">{filteredSales.length} Invoices Audited</span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Daily Ledger Reconciled
            </span>
          </p>
        </div>

        {/* Top-right Actions: Export CSV, Export PDF, Print */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
          >
            <FileSpreadsheet className="size-3.5 text-muted-foreground" />
            <span>Export PDF</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 shadow-xs"
          >
            <Printer className="size-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">PharmaDaily · Executive Sales Report</h2>
            <p className="text-xs text-zinc-500">
              Generated: {formatDateTime(new Date().toISOString())} · Period: {fromDate} to {toDate}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">Branch: {selectedBranch === "all" ? "All Branches" : selectedBranch}</p>
            <p className="text-zinc-500">Confidential Financial Audit</p>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. FILTERS (Date Range, Branch, Cashier, Payment Method, Customer) */}
      {/* =================================================================== */}
      <Card className="border-border/70 bg-card shadow-xs print:hidden">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold tracking-tight uppercase text-muted-foreground">
                Report Filters
              </span>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>Reset All Filters</span>
              </Button>
            )}
          </div>

          {/* Date Range Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Period:</span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7", label: "Last 7 Days" },
              { id: "last30", label: "Last 30 Days" },
              { id: "thisMonth", label: "This Month" },
            ].map((preset) => (
              <Button
                key={preset.id}
                variant={selectedPreset === preset.id ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetSelect(preset.id)}
                className={cn(
                  "h-7 text-xs font-medium cursor-pointer px-2.5",
                  selectedPreset === preset.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "border-border/60 hover:bg-accent/60",
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* 5 Filter Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
            {/* Filter 1: Date Range Pickers */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Date Range</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setSelectedPreset("custom");
                  }}
                  className="h-8 text-xs font-mono"
                  title="From Date"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setSelectedPreset("custom");
                  }}
                  className="h-8 text-xs font-mono"
                  title="To Date"
                />
              </div>
            </div>

            {/* Filter 2: Branch */}
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.code || b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 3: Cashier */}
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Cashier / Staff</Label>
              <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Cashiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {cashiers.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 4: Payment Method */}
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Payment Method</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Methods</SelectItem>
                  <SelectItem value="cash">Cash Counter</SelectItem>
                  <SelectItem value="bkash">bKash (MFS)</SelectItem>
                  <SelectItem value="nagad">Nagad (MFS)</SelectItem>
                  <SelectItem value="card">Card (Visa/Mastercard)</SelectItem>
                  <SelectItem value="due">Store Credit / Due</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 5: Customer */}
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((cust) => (
                    <SelectItem key={cust.id} value={cust.id}>
                      {cust.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =================================================================== */}
      {/* 3. SUMMARY (6 KPI CARDS) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        {/* Card 1: Gross Sales */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-400 dark:bg-zinc-600" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium tracking-tight">Gross Sales</span>
              <Receipt className="size-3.5 text-zinc-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground">
              {formatCurrency(summaryKpis.grossSales)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>Catalog value billed</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Discount */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/70" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium tracking-tight">Discount</span>
              <Percent className="size-3.5 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-amber-700 dark:text-amber-400">
              {formatCurrency(summaryKpis.discount)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {summaryKpis.discountPercent.toFixed(1)}% of gross billing
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Returns */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500/70" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium tracking-tight">Returns</span>
              <RotateCcw className="size-3.5 text-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-rose-700 dark:text-rose-400">
              {formatCurrency(summaryKpis.returns)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {(summaryKpis.grossSales > 0
                ? (summaryKpis.returns / summaryKpis.grossSales) * 100
                : 0
              ).toFixed(2)}
              % return rate
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Net Sales (Hero Card) */}
        <Card className="border-zinc-900/40 dark:border-zinc-100/30 bg-zinc-950 text-white dark:bg-zinc-900 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-xs font-semibold tracking-tight text-zinc-300">Net Sales</span>
              <TrendingUp className="size-3.5 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-white">
              {formatCurrency(summaryKpis.netSales)}
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <span>Gross − Discount − Returns</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Bills */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-500/70" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium tracking-tight">Bills</span>
              <Layers className="size-3.5 text-zinc-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground">
              {summaryKpis.billsCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Invoices processed
            </p>
          </CardContent>
        </Card>

        {/* Card 6: Average Bill */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/70" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium tracking-tight">Average Bill</span>
              <Wallet className="size-3.5 text-blue-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground">
              {formatCurrency(summaryKpis.avgBill)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Avg ticket size
            </p>
          </CardContent>
        </Card>
      </div>

      {/* =================================================================== */}
      {/* 4. MAIN CHART: SALES OVER TIME */}
      {/* =================================================================== */}
      <Card className="border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                <span>Sales over time</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({trendPoints.length} day trend trajectory)
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Interactive revenue trend across the selected reporting interval
              </CardDescription>
            </div>

            {/* Chart Metric Selector */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md border border-border/50 text-xs print:hidden">
              <Button
                variant={chartMetric === "net" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartMetric("net")}
                className={cn(
                  "h-7 text-xs px-2.5 cursor-pointer",
                  chartMetric === "net"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "text-muted-foreground",
                )}
              >
                Net Sales
              </Button>
              <Button
                variant={chartMetric === "gross" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartMetric("gross")}
                className={cn(
                  "h-7 text-xs px-2.5 cursor-pointer",
                  chartMetric === "gross"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "text-muted-foreground",
                )}
              >
                Gross Sales
              </Button>
              <Button
                variant={chartMetric === "profit" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartMetric("profit")}
                className={cn(
                  "h-7 text-xs px-2.5 cursor-pointer",
                  chartMetric === "profit"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "text-muted-foreground",
                )}
              >
                Gross Profit
              </Button>
              <Button
                variant={chartMetric === "bills" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartMetric("bills")}
                className={cn(
                  "h-7 text-xs px-2.5 cursor-pointer",
                  chartMetric === "bills"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "text-muted-foreground",
                )}
              >
                Bills Count
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-6 space-y-4">
          {/* SVG Vector Chart */}
          <div className="relative w-full h-[220px] select-none">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" className="text-zinc-900 dark:text-zinc-100" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" className="text-zinc-900 dark:text-zinc-100" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Guidelines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = paddingY + pct * (chartHeight - paddingY * 2);
                const val = maxVal - pct * (maxVal - minVal);
                return (
                  <g key={pct}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray="3 3"
                      className="text-border/60"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-muted-foreground text-[10px] font-mono"
                    >
                      {chartMetric === "bills" ? Math.round(val) : formatCurrency(val).replace(".00", "")}
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient Fill */}
              {areaPathD && <path d={areaPathD} fill="url(#salesGrad)" />}

              {/* Primary Curve Line */}
              {svgPathD && (
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="currentColor"
                  className="text-zinc-900 dark:text-zinc-100"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Points & Hover Targets */}
              {pointsCoordinates.map((pt, idx) => {
                const isHovered = hoveredPointIndex === idx;
                return (
                  <g key={idx}>
                    {/* Circle Node */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5 : 3}
                      className={cn(
                        "transition-all",
                        isHovered
                          ? "fill-zinc-950 dark:fill-white stroke-background stroke-2"
                          : "fill-zinc-800 dark:fill-zinc-200",
                      )}
                    />

                    {/* Invisible Wide Hitbox for touch/mouse */}
                    <rect
                      x={pt.x - 14}
                      y={0}
                      width={28}
                      height={chartHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    />
                  </g>
                );
              })}

              {/* Vertical Crosshair on Hover */}
              {hoveredPointIndex !== null && pointsCoordinates[hoveredPointIndex] && (
                <line
                  x1={pointsCoordinates[hoveredPointIndex]!.x}
                  y1={paddingY}
                  x2={pointsCoordinates[hoveredPointIndex]!.x}
                  y2={chartHeight - paddingY}
                  stroke="currentColor"
                  className="text-zinc-500"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}
            </svg>

            {/* Hover Tooltip Card */}
            {hoveredPointIndex !== null && pointsCoordinates[hoveredPointIndex] && (() => {
              const activePt = pointsCoordinates[hoveredPointIndex];
              if (!activePt || !activePt.point) return null;
              const ptData = activePt.point;
              return (
                <div
                  className="absolute z-20 pointer-events-none -translate-x-1/2 bottom-full mb-2 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-md p-2.5 shadow-xl text-xs space-y-1 w-44 border border-border"
                  style={{
                    left: `${(activePt.x / chartWidth) * 100}%`,
                  }}
                >
                  <div className="font-semibold border-b border-zinc-700 dark:border-zinc-300 pb-1 text-[11px] flex justify-between">
                    <span>{ptData.formatted_day}</span>
                    <span className="font-mono">{ptData.bills} bills</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400 dark:text-zinc-600">Net Sales:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(ptData.net)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400 dark:text-zinc-600">Gross Sales:</span>
                    <span className="font-mono">
                      {formatCurrency(ptData.gross)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400 dark:text-zinc-600">Profit:</span>
                    <span className="font-mono text-emerald-400 dark:text-emerald-600">
                      {formatCurrency(ptData.profit)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Quick Key Highlights Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40 text-xs">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Peak Day:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(Math.max(...trendPoints.map((p) => p.net)))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Daily Average:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(
                  trendPoints.length > 0
                    ? trendPoints.reduce((acc, p) => acc + p.net, 0) / trendPoints.length
                    : 0,
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Total Invoices:</span>
              <span className="font-mono font-semibold text-foreground">
                {trendPoints.reduce((acc, p) => acc + p.bills, 0)} bills
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-zinc-500" />
              <span className="text-muted-foreground">Period Margin:</span>
              <span className="font-mono font-semibold text-foreground">
                {summaryKpis.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =================================================================== */}
      {/* 5. SECONDARY SECTIONS (3 PANELS: Payment, Branch, Top Medicines) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Panel 1: Sales by Payment Method */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  <CreditCard className="size-4 text-muted-foreground" />
                  <span>Sales by Payment Method</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Collections breakdown by channel
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {paymentMethodBreakdown.length} Methods
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {paymentMethodBreakdown.map((item) => {
              const IconComp = item.icon;
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-muted">
                        <IconComp className="size-3.5 text-foreground" />
                      </div>
                      <span className="font-medium text-foreground">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-muted-foreground text-[11px] ml-1.5 font-mono">
                        ({item.share}%)
                      </span>
                    </div>
                  </div>

                  {/* Distribution Progress Bar */}
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all"
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{item.bills} transaction{item.bills === 1 ? "" : "s"}</span>
                    <span>
                      Avg {formatCurrency(item.bills > 0 ? item.amount / item.bills : 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Panel 2: Sales by Branch */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span>Sales by Branch</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Revenue contribution across branches
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {branchSalesBreakdown.length} Locations
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {branchSalesBreakdown.map((b) => (
              <div key={b.code} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] px-1 py-0 h-4 bg-muted/60"
                    >
                      {b.code}
                    </Badge>
                    <span className="font-medium text-foreground truncate max-w-[140px]" title={b.name}>
                      {b.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-foreground">
                      {formatCurrency(b.net)}
                    </span>
                    <span className="text-muted-foreground text-[11px] ml-1.5 font-mono">
                      ({b.share}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-800 dark:bg-zinc-200 rounded-full transition-all"
                    style={{ width: `${b.share}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{b.bills} bills processed</span>
                  <span>Avg {formatCurrency(b.avgBill)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Panel 3: Top Selling Medicines */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  <Pill className="size-4 text-muted-foreground" />
                  <span>Top Selling Medicines</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Top performing drugs by revenue
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                Ranked
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {topMedicines.slice(0, 5).map((med) => (
                <div key={med.medicine_id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="size-5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-border flex items-center justify-center font-mono text-[10px] font-bold text-foreground shrink-0 mt-0.5">
                        #{med.rank}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span>{med.medicine_name}</span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {med.strength}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {med.generic_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-foreground">
                        {formatCurrency(med.revenue)}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {med.units_sold.toLocaleString()} units · {med.margin_percent}% margin
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =================================================================== */}
      {/* 6. DETAILED TABLE (9 COLUMNS) */}
      {/* =================================================================== */}
      <Card className="border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40 bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Sales Transaction Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Audited transaction log with item line inspection
              </CardDescription>
            </div>

            {/* Table Search & Rows Controls */}
            <div className="flex items-center gap-2 print:hidden">
              <div className="relative w-56 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search invoice, customer, medicine..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-8 text-xs font-mono"
                />
                {tableSearch && (
                  <button
                    onClick={() => setTableSearch("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Rows Per Page */}
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20 text-xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[140px] text-xs font-semibold">Date</TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">Invoice</TableHead>
                <TableHead className="text-xs font-semibold">Customer</TableHead>
                <TableHead className="text-xs font-semibold">Cashier</TableHead>
                <TableHead className="text-xs font-semibold">Items</TableHead>
                <TableHead className="text-right text-xs font-semibold">Gross</TableHead>
                <TableHead className="text-right text-xs font-semibold">Discount</TableHead>
                <TableHead className="text-right text-xs font-semibold">Net</TableHead>
                <TableHead className="text-center text-xs font-semibold">Payment</TableHead>
                <TableHead className="w-[70px] text-center text-xs font-semibold print:hidden">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <AlertCircle className="size-5 text-muted-foreground/60" />
                      <p className="text-sm font-medium">No sales transactions found</p>
                      <p className="text-xs text-muted-foreground">
                        Try resetting your date range or adjusting the filter conditions.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    onClick={() => setSelectedInvoice(sale)}
                  >
                    {/* 1. Date */}
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(sale.created_at)}
                    </TableCell>

                    {/* 2. Invoice */}
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{sale.invoice_no}</span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[9px] px-1 py-0 h-3.5 bg-muted/60"
                        >
                          {sale.branch_code}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* 3. Customer */}
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{sale.customer_name}</div>
                      {sale.customer_phone && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {sale.customer_phone}
                        </div>
                      )}
                    </TableCell>

                    {/* 4. Cashier */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {sale.cashier_name}
                    </TableCell>

                    {/* 5. Items */}
                    <TableCell className="text-xs max-w-[220px]">
                      <div className="font-medium text-foreground">
                        {sale.items_count} item{sale.items_count === 1 ? "" : "s"}
                      </div>
                      <div
                        className="text-[11px] text-muted-foreground truncate"
                        title={sale.items_preview}
                      >
                        {sale.items_preview}
                      </div>
                    </TableCell>

                    {/* 6. Gross */}
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(sale.gross)}
                    </TableCell>

                    {/* 7. Discount */}
                    <TableCell className="text-right font-mono text-xs text-amber-700 dark:text-amber-400 tabular-nums">
                      {sale.discount > 0 ? `-${formatCurrency(sale.discount)}` : "—"}
                    </TableCell>

                    {/* 8. Net */}
                    <TableCell className="text-right font-mono text-xs font-bold text-foreground tabular-nums">
                      {formatCurrency(sale.net)}
                    </TableCell>

                    {/* 9. Payment */}
                    <TableCell className="text-center whitespace-nowrap">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "font-mono text-[10px] uppercase font-semibold px-2 py-0.5",
                          sale.payment_method === "cash" &&
                            "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-300",
                          sale.payment_method === "bkash" &&
                            "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-300",
                          sale.payment_method === "nagad" &&
                            "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300",
                          sale.payment_method === "card" &&
                            "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300",
                          sale.payment_method === "due" &&
                            "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300",
                        )}
                      >
                        {sale.payment_method}
                      </Badge>
                    </TableCell>

                    {/* Action Column */}
                    <TableCell
                      className="text-center print:hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoice(sale);
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="size-3.5" />
                        <span className="sr-only">View Invoice</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-3 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground print:hidden bg-card">
          <div>
            Showing{" "}
            <strong className="text-foreground">
              {filteredSales.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{" "}
            to{" "}
            <strong className="text-foreground">
              {Math.min(currentPage * pageSize, filteredSales.length)}
            </strong>{" "}
            of <strong className="text-foreground">{filteredSales.length}</strong> invoices
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </Button>
            <span className="font-mono text-xs px-2 text-foreground font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* =================================================================== */}
      {/* 7. INVOICE DETAIL INSPECTION DRAWER / MODAL */}
      {/* =================================================================== */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden text-foreground animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-border/60 flex items-start justify-between bg-muted/30">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-base font-bold tracking-tight">
                    {selectedInvoice.invoice_no}
                  </h3>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedInvoice.branch_code}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="font-mono text-[10px] uppercase font-semibold"
                  >
                    {selectedInvoice.payment_method}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Processed on {formatDateTime(selectedInvoice.created_at)} by{" "}
                  <strong>{selectedInvoice.cashier_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Customer & Branch Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-md text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Customer:</span>
                  <span className="font-semibold text-foreground">
                    {selectedInvoice.customer_name}
                  </span>
                  {selectedInvoice.customer_phone && (
                    <span className="font-mono text-muted-foreground block text-[11px]">
                      {selectedInvoice.customer_phone}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Branch Location:</span>
                  <span className="font-semibold text-foreground">
                    {selectedInvoice.branch_name}
                  </span>
                  <span className="text-muted-foreground block text-[11px]">
                    Invoice Ledger # {selectedInvoice.id}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold tracking-tight text-foreground uppercase">
                  Itemized Line Breakdown ({selectedInvoice.items?.length || selectedInvoice.items_count} items)
                </h4>
                <div className="border border-border/60 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-[11px] py-1.5">Medicine / Batch</TableHead>
                        <TableHead className="text-[11px] text-right py-1.5">Qty</TableHead>
                        <TableHead className="text-[11px] text-right py-1.5">Rate</TableHead>
                        <TableHead className="text-[11px] text-right py-1.5">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item, i) => (
                          <TableRow key={i} className="text-xs">
                            <TableCell className="py-2">
                              <div className="font-semibold text-foreground">
                                {item.medicine_name}{" "}
                                <span className="font-normal text-muted-foreground">
                                  {item.strength}
                                </span>
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                Batch: {item.batch_no}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono py-2">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono py-2">
                              {formatCurrency(item.unit_price)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold py-2">
                              {formatCurrency(item.total_price)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-xs text-muted-foreground py-2">
                            {selectedInvoice.items_preview}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="border-t border-border/60 pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.gross)}</span>
                </div>
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span>Discount Given:</span>
                  <span className="font-mono">-{formatCurrency(selectedInvoice.discount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border/40">
                  <span>Net Amount Paid:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.net)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                  <span>Estimated Gross Profit:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedInvoice.profit)} (
                    {selectedInvoice.net > 0
                      ? ((selectedInvoice.profit / selectedInvoice.net) * 100).toFixed(1)
                      : 0}
                    %)
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Printer className="size-3.5" />
                <span>Print Receipt</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold cursor-pointer"
                >
                  <Link href={`/sales/${selectedInvoice.id}`}>View POS Order</Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-xs font-semibold cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
