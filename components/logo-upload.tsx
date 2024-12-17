"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

interface LogoUploadProps {
  initialLogo?: string;
  onLogoChange: (logo: File | null) => void;
}

export function LogoUpload({ initialLogo, onLogoChange }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(initialLogo || null);

  useEffect(() => {
    if (initialLogo) {
      setPreview(initialLogo);
    }
  }, [initialLogo]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onLogoChange(file);
    } else {
      setPreview(null);
      onLogoChange(null);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <Label htmlFor="logo-upload">Hospital Logo</Label>
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 border rounded-md overflow-hidden flex items-center justify-center bg-gray-100">
              {preview ? (
                <Image
                  src={preview}
                  alt="Logo preview"
                  width={96}
                  height={96}
                  objectFit="contain"
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
      </CardContent>
    </Card>
  );
}
