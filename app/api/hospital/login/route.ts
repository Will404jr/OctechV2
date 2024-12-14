import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Staff } from "@/lib/models/hospital";
import { getSession } from "@/lib/session";

interface LoginRequestBody {
  email: string;
  password: string;
  username?: string;
  isActiveDirectory?: boolean;
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email, password }: LoginRequestBody = await request.json();

    const staffMember = await Staff.findOne({ email }).populate("role");
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

    const session = await getSession();
    session.userId = staffMember._id.toString();
    session.isLoggedIn = true;
    session.role = staffMember.role.name;
    session.permissions = staffMember.role.permissions;
    await session.save();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
