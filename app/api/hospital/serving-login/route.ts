import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Staff } from "@/lib/models/hospital";
import { getSession } from "@/lib/session";

interface LoginRequestBody {
  email: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email, password }: LoginRequestBody = await request.json();

    const session = await getSession();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Regular staff login logic
    const staffMember = await Staff.findOne({ email });
    if (!staffMember) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValidPassword = await staffMember.comparePassword(password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Set basic session information
    session.userId = staffMember._id.toString();
    session.isLoggedIn = true;
    session.expiresAt = Date.now() + expirationTime;

    // Note: We no longer set department and roomId here
    // These will be set after the user selects a department and room

    await session.save();

    // Return staff information for the next step
    return NextResponse.json(
      {
        success: true,
        userId: staffMember._id.toString(),
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        // We don't return department here as it will be selected by the user
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
