import { NextRequest, NextResponse } from "next/server";
import { Branch } from "@/lib/models/bank";
import dbConnect from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { username, password } = await req.json();

    const branch = await Branch.findOne({ kioskUsername: username });

    if (!branch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await branch.compareKioskPassword(password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create a session or token here
    // For simplicity, we'll just return the branch ID
    // In a real-world scenario, you'd want to use a proper session management system
    return NextResponse.json(
      { message: "Kiosk login successful", branchId: branch._id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Kiosk login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
