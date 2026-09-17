"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Banknote,
  ScrollText,
  Wallet,
  BarChart3,
  Boxes,
  Building2,
  LayoutDashboard,
  Package,
  Pill,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

import { type UserRole } from "@/types";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly UserRole[];
  /** Route not built yet — rendered disabled so the shape of the app is visible. */
  comingSoon?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const ALL: readonly UserRole[] = [
  "super_admin",
  "branch_manager",
  "cashier",
  "stock_manager",
  "pharmacist",
];

/**
 * Navigation for every phase, with the unbuilt routes disabled.
 *
 * `roles` hides what a user has no business seeing — but it is presentation
 * only. Each route re-checks authorisation server-side, and the database
 * enforces branch isolation regardless of what the client renders.
 */
/**
 * Who may sell. Must stay in step with can_sell() in the database — a
 * pharmacist can complete sales (and is the only one who can dispense a
 * controlled drug), so hiding the till from them just means typing the URL
 * by hand.
 */
const CAN_SELL: readonly UserRole[] = [
  "super_admin",
  "branch_manager",
  "cashier",
  "pharmacist",
] as const;

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL }],
  },
  {
    // The till comes first inside its group and the group comes first after
    // the dashboard: it is the screen a counter spends the whole day in, and
    // every click it costs is paid hundreds of times a week.
    label: "Sell",
    items: [
      {
        title: "Point of Sale",
        href: "/pos",
        icon: ShoppingCart,
        roles: CAN_SELL,
      },
      {
        title: "Sales",
        href: "/sales",
        icon: Receipt,
        roles: CAN_SELL,
      },
      {
        title: "Customers",
        href: "/customers",
        icon: Users,
        roles: CAN_SELL,
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        title: "Medicines",
        href: "/medicines",
        icon: Pill,
        roles: ["super_admin", "branch_manager", "stock_manager", "pharmacist"],
      },
      {
        title: "Stock",
        href: "/stock",
        icon: Boxes,
        roles: ["super_admin", "branch_manager", "stock_manager"],
      },
      {
        title: "Purchases",
        href: "/purchases",
        icon: Package,
        roles: ["super_admin", "branch_manager", "stock_manager"],
      },
      {
        title: "Suppliers",
        href: "/suppliers",
        icon: Truck,
        roles: ["super_admin", "branch_manager", "stock_manager"],
      },
      {
        title: "Transfers",
        href: "/transfers",
        icon: ArrowLeftRight,
        roles: ["super_admin", "branch_manager", "stock_manager"],
      },
    ],
  },
  {
    // Money that moves today, as opposed to reports about money that moved
    // already — opening and counting a till is a shift-level chore, not an
    // insight, and grouping it with the charts buried it.
    label: "Money",
    items: [
      {
        title: "Cash & till",
        href: "/cash",
        icon: Banknote,
        roles: CAN_SELL,
      },
      {
        title: "Expenses",
        href: "/expenses",
        icon: Wallet,
        roles: ["super_admin", "branch_manager"],
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        title: "Reports",
        href: "/reports/sales",
        icon: BarChart3,
        roles: ["super_admin", "branch_manager"],
      },
      {
        title: "Audit log",
        href: "/audit",
        icon: ScrollText,
        roles: ["super_admin", "branch_manager"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Branches",
        href: "/branches",
        icon: Building2,
        roles: ["super_admin"],
      },
      {
        title: "Staff",
        href: "/staff",
        icon: Users,
        roles: ["super_admin", "branch_manager"],
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["super_admin", "branch_manager"],
      },
    ],
  },
];

export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Pill className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">PharmaDaily</span>
                  <span className="text-muted-foreground truncate text-xs">Pharmacy system</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <SidebarMenuItem key={item.href}>
                      {item.comingSoon ? (
                        <SidebarMenuButton
                          tooltip={`${item.title} — coming soon`}
                          className="cursor-not-allowed opacity-50"
                          aria-disabled
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/*
        No footer note. What used to sit here — "Phase 6 · Offline & audit" —
        was the build plan leaking into the product: it means nothing to
        someone running a pharmacy, and the space reads cleaner empty than
        filled with something they have to ignore.
      */}

      <SidebarRail />
    </Sidebar>
  );
}
