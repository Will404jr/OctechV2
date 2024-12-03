"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import Image from "next/image";

// const timezones = [
//   "UTC",
//   "America/New_York",
//   "America/Chicago",
//   "America/Denver",
//   "America/Los_Angeles",
//   "Europe/London",
//   "Europe/Paris",
//   "Asia/Tokyo",
//   "Asia/Dubai",
//   "Australia/Sydney",
// ];

// const languages = [
//   { code: "en", name: "English" },
//   { code: "es", name: "Spanish" },
//   { code: "fr", name: "French" },
//   { code: "de", name: "German" },
//   { code: "ar", name: "Arabic" },
//   { code: "zh", name: "Chinese" },
// ];

interface Settings {
  companyName: string;
  email: string;
  contact: string;
  address: string;
  // timezone: string;
  // defaultLanguage: string;
  notificationText?: string;
  logoImage?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const { register, handleSubmit, setValue } = useForm<Settings>();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/hospital/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        Object.keys(data).forEach((key) => {
          setValue(key as keyof Settings, data[key]);
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const onSubmit = async (data: Settings) => {
    try {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (key !== "logoImage") {
          formData.append(key, data[key as keyof Settings] as string);
        }
      });

      if (data.logoImage && data.logoImage[0]) {
        formData.append("logoImage", data.logoImage[0]);
      }

      const response = await fetch("/api/hospital/settings", {
        method: settings ? "PUT" : "POST",
        body: formData,
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your organization settings
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" {...register("companyName")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input id="contact" {...register("contact")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" {...register("address")} />
            </div>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle>Localization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select onValueChange={(value) => setValue("timezone", value)}>
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
            <div className="grid gap-2">
              <Label htmlFor="defaultLanguage">Default Language</Label>
              <Select
                onValueChange={(value) => setValue("defaultLanguage", value)}
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
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="notificationText">Notification Banner Text</Label>
              <Textarea
                id="notificationText"
                {...register("notificationText")}
                placeholder="Enter text to display on the notification banner..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logoImage">Logo Image</Label>
              <Input
                id="logoImage"
                type="file"
                accept="image/*"
                {...register("logoImage")}
              />
              {settings?.logoImage && (
                <div className="mt-2">
                  <Image
                    src={settings.logoImage}
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

        <Button type="submit" size="lg" className="bg-[#0e4480]">
          Save Changes
        </Button>
      </form>
    </div>
  );
}
