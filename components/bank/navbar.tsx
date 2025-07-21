import type { ReactNode } from "react";
import { UserButton } from "@/components/bank/user-button";

interface NavbarProps {
  children?: ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  return (
    <div className="border-b  bg-gradient-to-br from-blue-800 via-green-400 to-blue-800">
      <div className="flex h-16 items-center px-4">
        {children}
        <div className="ml-auto flex items-center space-x-4">
          <UserButton />
        </div>
      </div>
    </div>
  );
}
