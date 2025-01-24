"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
}

export function ProtectedRoute({
  children,
  requiredPermission,
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/hospital/permissions");
        if (response.ok) {
          const data = await response.json();
          const hasPermission = data.permissions[requiredPermission];
          setIsAuthorized(hasPermission);
          if (!hasPermission) {
            router.push("/hospital/dashboard");
          }
        } else {
          // console.error("Failed to fetch user permissions");
          router.push("/hospital/login");
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
        router.push("/hospital/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [requiredPermission, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
