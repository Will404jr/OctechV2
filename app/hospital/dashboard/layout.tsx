import type React from "react"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { DashboardContent } from "../dashboard-content"

export default function HospitalDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}
