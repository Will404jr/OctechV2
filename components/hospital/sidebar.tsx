"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Shield, MonitorPlay, ListTodo, Menu, Settings, Building2, ConciergeBell } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Octech from "@/public/octech.jpg"
import { QueueSpinner } from "@/components/queue-spinner"
import { useToast } from "@/hooks/use-toast"
import { useSidebar } from "@/contexts/sidebar-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const routes = [
  {
    label: "Staff",
    icon: Users,
    href: "/hospital/dashboard/staff",
    permission: "Staff",
  },
  {
    label: "User Roles",
    icon: Shield,
    href: "/hospital/dashboard/roles",
    permission: "Roles",
  },
  {
    label: "Tickets",
    icon: MonitorPlay,
    href: "/hospital/dashboard/tickets",
    permission: "Tickets",
  },
  {
    label: "Departments",
    icon: ListTodo,
    href: "/hospital/dashboard/queues",
    permission: "Queues",
  },
  {
    label: "Receptionist",
    icon: ConciergeBell,
    href: "/hospital/dashboard/receptionist",
    permission: "Receptionist",
  },
  {
    label: "Upcoming-events",
    icon: Building2,
    href: "/hospital/dashboard/events",
    permission: "UpcomingEvents",
  },
  {
    label: "Display Ads",
    icon: Menu,
    href: "/hospital/dashboard/ads",
    permission: "Ads",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/hospital/dashboard/settings",
    permission: "Settings",
  },
]

interface SidebarProps {
  onLinkClick?: () => void
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { collapsed } = useSidebar()

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/hospital/permissions")
        if (response.ok) {
          const data = await response.json()
          setUserPermissions(data.permissions || {})
        } else {
          toast({
            title: "Error",
            description: "Session expired, Please login again",
            variant: "destructive",
          })
          router.push("/hospital/login")
        }
      } catch (error) {
        console.error("Error fetching user permissions:", error)
        router.push("/hospital/login")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserPermissions()
  }, [router, toast])

  const filteredRoutes = routes.filter((route) => userPermissions[route.permission])

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick()
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
      </div>
    )
  }

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-white">
      <div className={cn("px-3 py-2 flex-shrink-0", collapsed && "flex justify-center")}>
        <Link href="/hospital/dashboard" onClick={handleLinkClick}>
          {collapsed ? (
            <div className="w-10 h-10 relative overflow-hidden rounded-full">
              <Image src={Octech || "/placeholder.svg"} alt="octech logo" fill className="object-cover" />
            </div>
          ) : (
            <Image src={Octech || "/placeholder.svg"} alt="octech logo" height={100} />
          )}
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3">
        <TooltipProvider delayDuration={0}>
          {filteredRoutes.map((route) => (
            <Tooltip key={route.href}>
              <TooltipTrigger asChild>
                <Button
                  variant={pathname === route.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start mb-1",
                    pathname === route.href && "bg-[#0e4480] text-white",
                    collapsed && "px-2",
                  )}
                  asChild
                >
                  <Link href={route.href} onClick={handleLinkClick}>
                    <route.icon className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-2")} />
                    {!collapsed && route.label}
                  </Link>
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{route.label}</TooltipContent>}
            </Tooltip>
          ))}
        </TooltipProvider>
      </ScrollArea>
    </div>
  )
}
