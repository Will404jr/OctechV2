import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Admin } from "@/lib/models/admin";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    await dbConnect();

    // Parse and validate request data
    const { email, password, username } = await request.json();
    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new admin
    const admin = await Admin.create({
      username,
      email,
      password: hashedPassword, // Save the hashed password
    });

    // Initialize session
    const session = await getSession();
    session.userId = admin._id.toString();
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
