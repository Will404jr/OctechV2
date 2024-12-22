"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueueSpinner } from "@/components/queue-spinner";

type Settings = {
  companyType: "Hospital" | "Bank";
} | null;

export function ClientSideNavigation({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!settings) {
      router.push("/settingsForm");
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
        <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
      </div>
    );
  }

  return null;
}
