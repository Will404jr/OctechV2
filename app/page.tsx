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
import { Users, Clock, BarChart, ArrowRight } from "lucide-react";

async function getSettings() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
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
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

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
    // <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center items-center p-6">
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/bg.jpg?height=1080&width=1920')",
      }}
    >
      <div className="w-full max-w-6xl space-y-12">
        <div className="text-center space-y-4 bg-transparent">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-blue-800 bg-clip-text text-transparent">
            Queue Management System
          </h1>
          <p className="text-2xl text-white max-w-2xl mx-auto">
            Transform your customer experience with intelligent queue management
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              icon: <Users className="h-12 w-12" />,
              title: "Smart Crowd Management",
              description:
                "Advanced algorithms to organize and optimize customer flow in real-time",
            },
            {
              icon: <Clock className="h-12 w-12" />,
              title: "Minimal Wait Times",
              description:
                "Smart predictions and resource allocation to reduce customer waiting",
            },
            {
              icon: <BarChart className="h-12 w-12" />,
              title: "Real-time Analytics",
              description:
                "Comprehensive dashboards with actionable insights for better decision-making",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="relative bg-transparent"
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <Card
                className={`h-full transition-all duration-300 bg-transparent border-none text-white ${
                  hoveredCard === index
                    ? "transform -translate-y-2 shadow-lg"
                    : ""
                }`}
              >
                <CardHeader>
                  <div
                    className={`flex justify-center mb-4 transition-colors duration-300 text-white ${
                      hoveredCard === index ? "text-primary" : "text-gray-600"
                    }`}
                  >
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-center mb-2">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-white">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-12">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={isLoading}
            className="text-lg px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 bg-blue-800"
          >
            {isLoading ? (
              "Loading..."
            ) : (
              <span className="flex items-center gap-2">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
