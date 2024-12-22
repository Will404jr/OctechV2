"use client";

import { useState, useEffect } from "react";
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
import { QueueSpinner } from "@/components/queue-spinner";

const routes = [
  {
    label: "Branches",
    icon: Building2,
    href: "/bank/dashboard/branches",
    permission: "Branches",
  },
  {
    label: "Users",
    icon: Users,
    href: "/bank/dashboard/users",
    permission: "Users",
  },
  {
    label: "User Roles",
    icon: Shield,
    href: "/bank/dashboard/roles",
    permission: "Roles",
  },
  {
    label: "Serving",
    icon: MonitorPlay,
    href: "/bank/dashboard/serving",
    permission: "Serving",
  },
  {
    label: "Queues",
    icon: ListTodo,
    href: "/bank/dashboard/queues",
    permission: "Queues",
  },
  {
    label: "Exchange Rates",
    icon: DollarSign,
    href: "/bank/dashboard/exchange",
    permission: "ExchangeRates",
  },
  {
    label: "Display Ads",
    icon: Menu,
    href: "/bank/dashboard/ads",
    permission: "Ads",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/bank/dashboard/settings",
    permission: "Settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/bank/permissions");
        if (response.ok) {
          const data = await response.json();
          setUserPermissions(data.permissions || {});
        } else {
          console.error(
            "Failed to fetch user permissions:",
            await response.text()
          );
        }
      } catch (error) {
        console.error("Error fetching user permissions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPermissions();
  }, []);

  const filteredRoutes = routes.filter(
    (route) => userPermissions[route.permission]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center">
        <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-white border-r">
      <div className="px-3 py-2">
        <Link href="/bank/dashboard">
          <Image src={Octech} alt="octech logo" height={100} />
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3">
        {filteredRoutes.map((route) => (
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
