"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  Users,
  Shield,
  MonitorPlay,
  ListTodo,
  DollarSign,
  Menu,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Octech from "@/public/octech.jpg";

const routes = [
  {
    label: "Branches",
    icon: Building2,
    href: "/bank/dashboard/branches",
  },
  {
    label: "Users",
    icon: Users,
    href: "/bank/dashboard/users",
  },
  {
    label: "User Roles",
    icon: Shield,
    href: "/bank/dashboard/roles",
  },
  {
    label: "Serving",
    icon: MonitorPlay,
    href: "/bank/dashboard/serving",
  },
  {
    label: "Queues",
    icon: ListTodo,
    href: "/bank/dashboard/queues",
  },
  {
    label: "Exchange Rates",
    icon: DollarSign,
    href: "/bank/dashboard/exchange",
  },
  {
    label: "Display Ads",
    icon: Menu,
    href: "/bank/dashboard/ads",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/bank/dashboard/settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-white border-r">
      <div className="px-3 py-2">
        <Link href="/bank/dashboard">
          <Image src={Octech} alt="octech logo" height={100} />
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3">
        {routes.map((route) => (
          <Button
            key={route.href}
            variant={pathname === route.href ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start mb-1",
              pathname === route.href && "bg-[#0e4480] text-white"
            )}
            asChild
          >
            <Link href={route.href}>
              <route.icon className="mr-2 h-5 w-5" />
              {route.label}
            </Link>
          </Button>
        ))}
      </ScrollArea>
    </div>
  );
}
