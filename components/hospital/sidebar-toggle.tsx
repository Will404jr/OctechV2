"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/contexts/sidebar-context"

export function SidebarToggle() {
  const { collapsed, toggleSidebar } = useSidebar()

  return (
    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-white">
      {collapsed ? <ChevronRight /> : <ChevronLeft />}
      <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
    </Button>
  )
}
