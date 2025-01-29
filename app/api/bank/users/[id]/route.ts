"use server";

import { type NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/bank";
import dbConnect from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    await dbConnect();
    const user = await User.findById(id).select("username").lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const body = await req.json();

    // If a new password is provided, hash it
    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.password, salt);
    } else {
      // If no new password is provided, remove the password field to avoid overwriting with an empty value
      delete body.password;
    }

    const updatedUser = await User.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    })
      .populate("role")
      .populate("branch")
      .select("-password"); // Exclude password from the returned user object

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await connectDB();
    const rate = await User.findByIdAndDelete(id);

    if (!rate) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting user" },
      { status: 500 }
    );
  }
}
