"use client";

import { UserButton } from "@/components/hospital/user-button";
import { ModeToggle } from "@/components/mode-toggle";

export function Navbar() {
  return (
    <div className="border-b bg-[#0e4480]">
      <div className="flex h-16 items-center px-4">
        <div className="ml-auto flex items-center space-x-4">
          {/* <ModeToggle /> */}
          <UserButton />
        </div>
      </div>
    </div>
  );
}
