"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  MapPin,
  ChevronDown,
} from "lucide-react";

import { type UserRole } from "@/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
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
        title: "Role & Permissions",
        href: "/roles",
        icon: ShieldCheck,
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
  const { setOpenMobile, isMobile } = useSidebar();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-800/80 bg-[#0e1013]">
      <SidebarHeader className="border-b border-zinc-800/80 px-3.5 py-3.5 bg-[#0e1013]">
        <Link
          href="/dashboard"
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
          className="flex items-center gap-3 group"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-white shadow-xs group-hover:border-zinc-700 transition-colors shrink-0">
            <Pill className="size-4 text-white" />
          </div>
          <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-bold tracking-tight text-white text-sm">PharmaDaily</span>
            <span className="text-zinc-500 truncate text-[11px] font-medium">Pharmacy Management System</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-[#0e1013] px-2 py-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase px-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

                  return (
                    <SidebarMenuItem key={item.href}>
                      {item.comingSoon ? (
                        <SidebarMenuButton
                          tooltip={`${item.title} — coming soon`}
                          className="cursor-not-allowed opacity-40 text-xs text-zinc-500"
                          aria-disabled
                        >
                          <item.icon className="size-4 shrink-0" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className={cn(
                            "transition-all duration-150 rounded-xl text-xs font-medium h-9 px-2.5",
                            isActive
                              ? "bg-zinc-800/90 text-white font-semibold shadow-2xs hover:bg-zinc-800 hover:text-white"
                              : "text-zinc-400 hover:text-white hover:bg-zinc-900/80",
                          )}
                        >
                          <Link
                            href={item.href}
                            onClick={() => {
                              if (isMobile) setOpenMobile(false);
                            }}
                            className="flex items-center justify-between w-full"
                          >
                            <div className="flex items-center gap-2.5">
                              <item.icon className={cn("size-4 shrink-0", isActive ? "text-white" : "text-zinc-400")} />
                              <span>{item.title}</span>
                            </div>
                            {item.href === "/pos" && (
                              <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.2 text-[9px] font-mono font-bold text-zinc-300">
                                F2
                              </span>
                            )}
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

      <SidebarFooter className="p-3 border-t border-zinc-800/80 bg-[#0e1013] space-y-2 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#14171c] border border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
              <MapPin className="size-3.5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-xs truncate">Main Branch</p>
              <p className="text-[10px] text-zinc-400 truncate">Pharmacy</p>
            </div>
          </div>
          <ChevronDown className="size-3.5 text-zinc-500 shrink-0" />
        </div>
        <div className="flex items-center gap-2 px-1 text-[11px] font-medium text-zinc-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Online</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
