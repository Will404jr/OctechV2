"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SessionData } from "@/lib/session";
import { User } from "lucide-react";

interface StaffData {
  username: string;
}

export function UserButton() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchSessionAndStaffData() {
      const sessionResponse = await fetch("/api/session");
      if (sessionResponse.ok) {
        const sessionData: SessionData = await sessionResponse.json();
        setSession(sessionData);

        // Log the entire session data
        console.log("Session Data:", sessionData);

        if (sessionData.userId) {
          const staffResponse = await fetch(
            `/api/hospital/staff?id=${sessionData.userId}`
          );
          if (staffResponse.ok) {
            const staffData: StaffData = await staffResponse.json();
            setStaffData(staffData);
          }
        }
      }
    }
    fetchSessionAndStaffData();
  }, []);

  const handleLogout = async () => {
    const response = await fetch("/api/logout", { method: "POST" });
    if (response.ok) {
      setSession(null);
      setStaffData(null);
      router.push("/"); // Redirect to login page after logout
    }
  };

  if (!session || !staffData) {
    return null; // Or a loading spinner
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer bg-primary text-primary-foreground">
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {staffData.username}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
