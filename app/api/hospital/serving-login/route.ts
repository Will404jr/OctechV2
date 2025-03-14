import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Staff, Department } from "@/lib/models/hospital";
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

    // Find staff's department by checking all departments and their rooms
    const departments = await Department.find().populate({
      path: "rooms.staff",
      select: "_id",
    });

    let staffDepartment = null;
    let staffRoomId = null;

    for (const department of departments) {
      for (const room of department.rooms) {
        if (
          room.staff &&
          room.staff._id.toString() === staffMember._id.toString()
        ) {
          staffDepartment = department.title;
          staffRoomId = room._id;
          break;
        }
      }
      if (staffDepartment) break;
    }

    if (!staffDepartment) {
      return NextResponse.json(
        { error: "Staff not assigned to any department" },
        { status: 403 }
      );
    }

    session.userId = staffMember._id.toString();
    session.isLoggedIn = true;
    session.expiresAt = Date.now() + expirationTime;

    // Set department and room information
    session.department = staffDepartment;
    if (staffRoomId) {
      session.roomId = staffRoomId.toString();
    }

    await session.save();

    return NextResponse.json(
      {
        success: true,
        department: staffDepartment,
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
