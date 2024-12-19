"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  companyType: "Hospital" | "Bank";
} | null;

export function ClientSideNavigation({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!settings) {
      router.push("/hospital/settingsForm");
    } else if (settings.companyType === "Hospital") {
      router.push("/hospital/login");
    } else if (settings.companyType === "Bank") {
      router.push("/bank/login");
    } else {
      router.push("/settingsForm");
    }
    setIsLoading(false);
  }, [settings, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return null;
}
