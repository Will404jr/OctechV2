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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SessionData } from "@/lib/session";

export function UserButton() {
  const [session, setSession] = useState<SessionData | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchSession() {
      const response = await fetch("/api/session");
      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
      }
    }
    fetchSession();
  }, []);

  const handleLogout = async () => {
    const response = await fetch("/api/logout", { method: "POST" });
    if (response.ok) {
      setSession(null);
      router.push("/"); // Redirect to login page after logout
    }
  };

  if (!session) {
    return null; // Or a loading spinner
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src="/placeholder-avatar.jpg" />
          <AvatarFallback>
            {session.userId?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.userId}</p>
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
