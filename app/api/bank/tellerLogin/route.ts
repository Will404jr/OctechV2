import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/bank";
import { createSession } from "@/lib/session";

function getEndOfDay(): number {
  const now = new Date();
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0
  );
  return endOfDay.getTime();
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email, password } = await request.json();

    const user = await User.findOne({ email })
      .populate("role")
      .populate("branch");
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const sessionData = {
      userId: user._id.toString(),
      isLoggedIn: true,
      role: user.role.name,
      permissions: user.role.permissions,
      branchId: user.branch ? user.branch._id.toString() : undefined,
      expiresAt: getEndOfDay(),
    };

    const session = await createSession(sessionData);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          role: user.role.name,
          branchId: user.branch ? user.branch._id.toString() : undefined,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Teller login error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
