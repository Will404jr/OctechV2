"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";

const settingsFormSchema = z
  .object({
    companyType: z.enum(["Hospital", "Bank"], {
      required_error: "Please select a company type",
    }),
    companyName: z.string().min(1, "Company name is required"),
    email: z.string().email("Invalid email address"),
    contact: z.string().min(1, "Contact number is required"),
    address: z.string().min(1, "Address is required"),
    timezone: z.string().optional(),
    defaultLanguage: z.string().optional(),
    notificationText: z.string().min(1, "Notification text is required"),
    logoImage: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    kioskUsername: z.string().optional(),
    kioskPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.companyType === "Hospital") {
        return data.kioskUsername && data.kioskPassword;
      }
      return true;
    },
    {
      message: "Kiosk username and password are required for hospitals",
      path: ["kioskUsername", "kioskPassword"],
    }
  );

type SettingsFormValues = z.infer<typeof settingsFormSchema>;
const imgUrl = process.env.NEXT_PUBLIC_IMAGE_URL;

function LogoUpload({
  field,
  form,
  preview,
  setPreview,
}: {
  field: any;
  form: any;
  preview: string | null;
  setPreview: (preview: string | null) => void;
}) {
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("companyName", form.getValues("companyName"));

      try {
        const response = await fetch(`${imgUrl}/api/logo`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setPreview(`${imgUrl}/api/logo/image/${data.image}`);
          form.setValue("logoImage", data.image);
        } else {
          console.error("Failed to upload logo");
        }
      } catch (error) {
        console.error("Error uploading logo:", error);
      }
    } else {
      setPreview(null);
      form.setValue("logoImage", null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-24 h-24 border rounded-md overflow-hidden flex items-center justify-center bg-gray-100">
          {preview ? (
            <Image
              src={preview || "/placeholder.svg"}
              alt="Logo preview"
              width={96}
              height={96}
              unoptimized
            />
          ) : (
            <span className="text-gray-400">No logo</span>
          )}
        </div>
        <div className="flex-1">
          <Input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button asChild>
            <label htmlFor="logo-upload" className="cursor-pointer">
              Upload Logo
            </label>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      companyType: undefined,
      companyName: "",
      email: "",
      contact: "",
      address: "",
      timezone: "",
      defaultLanguage: "",
      notificationText: "",
      logoImage: undefined,
      password: "",
      kioskUsername: "",
      kioskPassword: "",
    },
  });

  const companyType = form.watch("companyType");

  useEffect(() => {
    async function fetchLogo() {
      try {
        const response = await fetch(`${imgUrl}/api/logo`);
        if (response.ok) {
          const logos = await response.json();
          if (logos.length > 0) {
            const latestLogo = logos[logos.length - 1];
            setPreview(`${imgUrl}/api/logo/image/${latestLogo.image}`);
            form.setValue("logoImage", latestLogo.image);
          }
        }
      } catch (error) {
        console.error("Error fetching logo:", error);
      }
    }

    fetchLogo();
  }, [form]);

  async function onSubmit(data: SettingsFormValues) {
    setIsLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === "logoImage") {
          // The logoImage is now just the filename, so we don't need to append it
        } else if (value !== undefined && value !== null && value !== "") {
          formData.append(key, value as string);
        }
      });

      // Explicitly add kioskUsername and kioskPassword if they exist
      if (data.kioskUsername) {
        formData.append("kioskUsername", data.kioskUsername);
      }
      if (data.kioskPassword) {
        formData.append("kioskPassword", data.kioskPassword);
      }

      // Determine the API endpoint based on the company type
      const apiEndpoint =
        data.companyType === "Hospital"
          ? "/api/hospital/settings"
          : "/api/bank/settings";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      const result = await response.json();
      toast({
        title: "Settings saved",
        description: "Your company settings have been successfully updated.",
      });

      // Navigate based on company type
      if (data.companyType === "Bank") {
        router.push("/bank/login");
      } else {
        router.push("/hospital/login");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center items-center p-6">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Company Settings</CardTitle>
          <CardDescription>
            Configure your company's general settings and access details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="companyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select company type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Hospital">Hospital</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your company's name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@company.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Company St, City, Country"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="EST">EST</SelectItem>
                          <SelectItem value="CST">CST</SelectItem>
                          <SelectItem value="PST">PST</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Language</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notificationText"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Notification Text</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Default notification message"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logoImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Logo</FormLabel>
                      <FormControl>
                        <LogoUpload
                          field={field}
                          form={form}
                          preview={preview}
                          setPreview={setPreview}
                        />
                      </FormControl>
                      <FormDescription>
                        Upload your company's logo image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Admin Access</h3>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Set the password for admin access
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {companyType === "Hospital" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Kiosk Access</h3>
                  <FormField
                    control={form.control}
                    name="kioskUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kiosk Username</FormLabel>
                        <FormControl>
                          <Input placeholder="kiosk_user" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kioskPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kiosk Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
