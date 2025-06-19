"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Sidebar } from "./sidebar"

export function MobileSidebar() {
  const [isMounted, setIsMounted] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleLinkClick = () => {
    setIsSheetOpen(false)
  }

  if (!isMounted) {
    return null
  }

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden text-white">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <Sidebar onLinkClick={handleLinkClick} />
      </SheetContent>
    </Sheet>
  )
}
