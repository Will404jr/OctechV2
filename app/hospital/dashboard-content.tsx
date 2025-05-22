"use client"

import type React from "react"
import { Sidebar } from "@/components/hospital/sidebar"
import { Navbar } from "@/components/hospital/navbar"
import { MobileSidebar } from "@/components/hospital/MobileSidebar"
import { useSidebar } from "@/contexts/sidebar-context"

export function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <div className="h-full relative">
      <div
        className={`hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-50 transition-all duration-300 ${
          collapsed ? "md:w-16" : "md:w-72"
        }`}
      >
        <Sidebar />
      </div>
      <main className={`transition-all duration-300 ${collapsed ? "md:pl-16" : "md:pl-72"}`}>
        <Navbar>
          <MobileSidebar />
        </Navbar>
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
