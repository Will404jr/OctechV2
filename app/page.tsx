"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Clock, BarChart } from "lucide-react";

async function getSettings() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${apiUrl}/api/settings`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!res.ok) {
      console.error(
        `Failed to fetch settings: ${res.status} ${res.statusText}`
      );
      return null;
    }
    const data = await res.json();
    return Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
}

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    const settings = await getSettings();
    setIsLoading(false);

    if (!settings) {
      router.push("/settingsForm");
    } else if (settings.companyType === "Hospital") {
      router.push("/hospital/login");
    } else if (settings.companyType === "Bank") {
      router.push("/bank/login");
    } else {
      router.push("/settingsForm");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-primary mb-2">
            Queue Management System
          </CardTitle>
          <CardDescription className="text-xl">
            Streamline your waiting experience
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Users className="h-10 w-10 text-primary" />}
            title="Manage Crowds"
            description="Efficiently organize and direct customer flow"
          />
          <FeatureCard
            icon={<Clock className="h-10 w-10 text-primary" />}
            title="Reduce Wait Times"
            description="Optimize service delivery and minimize delays"
          />
          <FeatureCard
            icon={<BarChart className="h-10 w-10 text-primary" />}
            title="Insightful Analytics"
            description="Gain valuable data to improve your operations"
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button size="lg" onClick={handleContinue} disabled={isLoading}>
            {isLoading ? "Loading..." : "Continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-center mb-4">{icon}</div>
        <CardTitle className="text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
