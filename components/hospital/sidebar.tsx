"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Shield,
  MonitorPlay,
  ListTodo,
  Menu,
  Settings,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Octech from "@/public/octech.jpg";

const routes = [
  {
    label: "Users",
    icon: Users,
    href: "/hospital/dashboard/users",
  },
  {
    label: "User Roles",
    icon: Shield,
    href: "/hospital/dashboard/roles",
  },
  {
    label: "Serving",
    icon: MonitorPlay,
    href: "/hospital/dashboard/serving",
  },
  {
    label: "Queues",
    icon: ListTodo,
    href: "/hospital/dashboard/queues",
  },
  {
    label: "Upcoming-events",
    icon: Building2,
    href: "/hospital/dashboard/events",
  },
  {
    label: "Display Ads",
    icon: Menu,
    href: "/hospital/dashboard/ads",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/hospital/dashboard/settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-white border-r">
      <div className="px-3 py-2">
        <Link href="/hospital/dashboard">
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
