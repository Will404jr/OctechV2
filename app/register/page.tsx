import { AuthForm } from "@/components/ui/auth-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <AuthForm mode="register" />
    </div>
  );
}
