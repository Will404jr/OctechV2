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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { QueueSpinner } from "@/components/queue-spinner";

interface LoginFormData {
  email: string;
  password: string;
}

const defaultValues: LoginFormData = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { control, handleSubmit } = useForm<LoginFormData>({
    defaultValues,
  });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/session");
        const session = await response.json();
        if (session.isLoggedIn) {
          router.push("/hospital/dashboard");
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/hospital/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          isAdminLogin,
        }),
      });

      if (response.ok) {
        router.push("/hospital/dashboard");
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

  if (isCheckingSession) {
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
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to log in</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="staff"
            onValueChange={(value) => setIsAdminLogin(value === "admin")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="staff">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email</Label>
                  <Controller
                    name="email"
                    control={control}
                    rules={{ required: "Email is required" }}
                    render={({ field }) => (
                      <Input
                        id="staff-email"
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-password">Password</Label>
                  <Controller
                    name="password"
                    control={control}
                    rules={{ required: "Password is required" }}
                    render={({ field }) => (
                      <Input id="staff-password" type="password" {...field} />
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#0e4480]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Staff Login"
                  )}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="admin">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Controller
                    name="email"
                    control={control}
                    rules={{ required: "Admin email is required" }}
                    render={({ field }) => (
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@example.com"
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Admin Password</Label>
                  <Controller
                    name="password"
                    control={control}
                    rules={{ required: "Admin password is required" }}
                    render={({ field }) => (
                      <Input id="admin-password" type="password" {...field} />
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#0e4480]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Admin Login"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <a
            href="/hospital/serving-login"
            className="text-lg text-[#0e4480] hover:underline"
          >
            Serving Dashboard
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
