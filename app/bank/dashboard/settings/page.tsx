"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface Settings {
  companyType: string;
  companyName: string;
  email: string;
  contact: string;
  address: string;
  timezone: string;
  defaultLanguage: string;
  notificationText: string;
  logoImage: string | File;
  password: string;
  kioskUsername: string;
  kioskPassword: string;
}

const timezones = ["UTC", "EST", "CST", "PST"];
const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
];

export default function SettingsDisplayPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showKioskPassword, setShowKioskPassword] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm<Settings>();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        Object.keys(data).forEach((key) => {
          if (key !== "password" && key !== "kioskPassword") {
            setValue(key as keyof Settings, data[key]);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: Settings) => {
    try {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (key === "password" || key === "kioskPassword") {
          if (data[key as keyof Settings]) {
            formData.append(key, data[key as keyof Settings] as string);
          }
        } else if (key === "logoImage") {
          if (data.logoImage instanceof File) {
            formData.append("logoImage", data.logoImage);
          } else if (
            settings?.logoImage &&
            typeof settings.logoImage === "string"
          ) {
            // If no new file is selected, keep the existing logo
            formData.append("logoImage", settings.logoImage);
          }
        } else {
          formData.append(key, data[key as keyof Settings] as string);
        }
      });

      const response = await fetch("/api/settings", {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        toast({
          title: "Success",
          description: "Settings updated successfully.",
        });
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const togglePasswordVisibility = (field: "password" | "kioskPassword") => {
    if (field === "password") {
      setShowPassword(!showPassword);
    } else {
      setShowKioskPassword(!showKioskPassword);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setValue("logoImage", e.target.files[0]);
    }
  };

  return (
    <ProtectedRoute requiredPermission="Settings">
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Settings Display</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* General Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="companyType">Company Type</Label>
                  <Select
                    onValueChange={(value) => setValue("companyType", value)}
                    value={watch("companyType")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hospital">Hospital</SelectItem>
                      <SelectItem value="Bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" {...register("companyName")} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} />
                </div>
                <div>
                  <Label htmlFor="contact">Contact Number</Label>
                  <Input id="contact" {...register("contact")} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" {...register("address")} />
              </div>
            </CardContent>
          </Card>

          {/* Localization Card */}
          <Card>
            <CardHeader>
              <CardTitle>Localization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    onValueChange={(value) => setValue("timezone", value)}
                    value={watch("timezone")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="defaultLanguage">Default Language</Label>
                  <Select
                    onValueChange={(value) =>
                      setValue("defaultLanguage", value)
                    }
                    value={watch("defaultLanguage")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                          {language.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notificationText">
                  Notification Banner Text
                </Label>
                <Textarea
                  id="notificationText"
                  {...register("notificationText")}
                  placeholder="Enter text to display on the notification banner..."
                />
              </div>
              <div>
                <Label htmlFor="logoImage">Logo Image</Label>
                <Input
                  id="logoImage"
                  type="file"
                  accept="image/*"
                  ref={logoInputRef}
                  onChange={handleLogoChange}
                />
                {settings?.logoImage && (
                  <div className="mt-2">
                    <Image
                      src={
                        typeof settings.logoImage === "string"
                          ? settings.logoImage
                          : URL.createObjectURL(settings.logoImage)
                      }
                      alt="Company Logo"
                      width={150}
                      height={150}
                      className="rounded-md"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Access Card */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Label htmlFor="password">New Admin Password</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Enter new password to change"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-6"
                  onClick={() => togglePasswordVisibility("password")}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Kiosk Access Card */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Kiosk Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="kioskUsername">Kiosk Username</Label>
                <Input id="kioskUsername" {...register("kioskUsername")} />
              </div>
              <div className="relative">
                <Label htmlFor="kioskPassword">New Kiosk Password</Label>
                <Input
                  id="kioskPassword"
                  type={showKioskPassword ? "text" : "password"}
                  {...register("kioskPassword")}
                  placeholder="Enter new password to change"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-6"
                  onClick={() => togglePasswordVisibility("kioskPassword")}
                >
                  {showKioskPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card> */}

          <Button type="submit" size="lg" className="bg-[#0e4480]">
            Save Changes
          </Button>
        </form>
      </div>
    </ProtectedRoute>
  );
}
