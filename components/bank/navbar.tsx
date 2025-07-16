import type { ReactNode } from "react";
import { UserButton } from "@/components/bank/user-button";

interface NavbarProps {
  children?: ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  return (
    <div className="border-b  bg-[#be0028]">
      <div className="flex h-16 items-center px-4">
        {children}
        <div className="ml-auto flex items-center space-x-4">
          <UserButton />
        </div>
      </div>
    </div>
  );
}
