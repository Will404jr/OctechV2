"use client";

import { useEffect, useState, useCallback } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavbarProps {
  staffId: string;
}

interface StaffData {
  _id: string;
  username: string;
}

export function Navbar({ staffId }: NavbarProps) {
  const router = useRouter();
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Serving Dashboard");

  const fetchCompanySettings = useCallback(async () => {
    try {
      const response = await fetch("/api/bank/settings");
      if (!response.ok) throw new Error("Failed to fetch company settings");

      const data = await response.json();
      if (data.companyName) {
        setCompanyName(data.companyName);
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  }, []);

  // Add this useEffect to call fetchCompanySettings when component mounts
  useEffect(() => {
    fetchCompanySettings();
  }, [fetchCompanySettings]);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const response = await fetch(`/api/hospital/staff/${staffId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch staff data");
        }
        const data = await response.json();
        setStaffData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load user data");
      }
    };

    if (staffId) {
      fetchStaffData();
    }
  }, [staffId]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/hospital/serving-login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <nav className="bg-[#0e4480] border-b border-blue-800">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/bank/serving"
            className="text-white text-xl font-semibold hover:text-blue-100 transition-colors"
          >
            {companyName}
          </Link>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-white hover:bg-blue-700 hover:text-white"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {staffData ? getInitials(staffData.username) : "..."}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {error ? "User" : staffData?.username || "Loading..."}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
