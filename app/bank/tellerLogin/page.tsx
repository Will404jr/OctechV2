"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QueueSpinner } from "@/components/queue-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LoginFormData {
  email: string;
  password: string;
}

interface CounterFormData {
  queueId: string;
  counterNumber: string;
}

interface QueueItem {
  _id: string;
  menuItem: {
    name: string;
  };
}

export default function TellerLoginPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const { control: loginControl, handleSubmit: handleLoginSubmit } =
    useForm<LoginFormData>({
      defaultValues: {
        email: "",
        password: "",
      },
    });
  const { control: counterControl, handleSubmit: handleCounterSubmit } =
    useForm<CounterFormData>({
      defaultValues: {
        queueId: "",
        counterNumber: "",
      },
    });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/session");
      const session = await response.json();
      if (session.isLoggedIn) {
        router.push("/bank/serving");
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking session:", error);
      setIsLoading(false);
    }
  };

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/bank/tellerLogin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsLoggedIn(true);
        fetchQueueItems();
      } else {
        const errorData = await response.json();
        toast({
          title: "Login Failed",
          description: errorData.error || "An error occurred during login.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onCounterSubmit = async (data: CounterFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/bank/counter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push("/bank/serving");
      } else {
        const errorData = await response.json();
        toast({
          title: "Counter Setup Failed",
          description:
            errorData.error || "An error occurred during counter setup.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Counter setup error:", error);
      toast({
        title: "Counter Setup Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQueueItems = async () => {
    try {
      const response = await fetch("/api/bank/queues");
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data);
      } else {
        throw new Error("Failed to fetch queue items");
      }
    } catch (error) {
      console.error("Error fetching queue items:", error);
      toast({
        title: "Error",
        description: "Failed to fetch queue items. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/bg.jpg?height=1080&width=1920')",
      }}
    >
      <Card className="w-[350px] bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Teller Login</CardTitle>
          <CardDescription>
            {isLoggedIn
              ? "Set up your counter"
              : "Enter your credentials to log in"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoggedIn ? (
            <form
              onSubmit={handleLoginSubmit(onLoginSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Controller
                  name="email"
                  control={loginControl}
                  rules={{ required: "Email is required" }}
                  render={({ field }) => (
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Controller
                  name="password"
                  control={loginControl}
                  rules={{ required: "Password is required" }}
                  render={({ field }) => (
                    <Input id="password" type="password" {...field} />
                  )}
                />
              </div>
              <Button type="submit" className="w-full text-lg bg-gradient-to-br from-blue-800 via-green-400 to-blue-800">
                Login
              </Button>
            </form>
          ) : (
            <form
              onSubmit={handleCounterSubmit(onCounterSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="queueId">Category</Label>
                <Controller
                  name="queueId"
                  control={counterControl}
                  rules={{ required: "Queue is required" }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="queueId">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {queueItems.map((item) => (
                          <SelectItem key={item._id} value={item._id}>
                            {item.menuItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counterNumber">Counter Number</Label>
                <Controller
                  name="counterNumber"
                  control={counterControl}
                  rules={{
                    required: "Counter number is required",
                    pattern: {
                      value: /^[0-9]+$/,
                      message: "Please enter a valid number",
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      id="counterNumber"
                      type="text"
                      placeholder="Enter counter number"
                      {...field}
                    />
                  )}
                />
              </div>
              <Button type="submit" className="w-full text-lg bg-[#1155a3]">
                Start Serving
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
