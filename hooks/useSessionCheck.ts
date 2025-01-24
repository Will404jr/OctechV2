"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useSessionCheck(interval = 60000) {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/session");
        const data = await res.json();
        setIsLoggedIn(data.isLoggedIn);

        if (!data.isLoggedIn) {
          const settingsRes = await fetch("/api/settings");
          const settings = await settingsRes.json();
          if (settings.companyType === "Hospital") {
            router.push("/hospital/login");
          } else if (settings.companyType === "Bank") {
            router.push("/bank/login");
          } else {
            router.push("/settingsForm");
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setIsLoggedIn(false);
      }
    };

    checkSession(); // Check immediately on mount
    const intervalId = setInterval(checkSession, interval);

    return () => clearInterval(intervalId);
  }, [router, interval]);

  return isLoggedIn;
}
