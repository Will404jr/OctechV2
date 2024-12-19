import { NextResponse } from "next/server";
import { resetAdminPassword } from "@/lib/adminUtils";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This route is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    const { password } = await request.json();
    await resetAdminPassword(password);
    return NextResponse.json({ message: "Admin password reset successfully" });
  } catch (error) {
    console.error("Error resetting admin password:", error);
    return NextResponse.json(
      { error: "Failed to reset admin password" },
      { status: 500 }
    );
  }
}
