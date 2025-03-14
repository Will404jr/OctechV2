import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Staff } from "@/lib/models/hospital";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const staff = await Staff.findById(id).select("username").lean();
      if (!staff) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }
      return NextResponse.json(staff);
    } else {
      const users = await Staff.find().populate("role", "name").lean();
      return NextResponse.json(users);
    }
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect(); // Ensure the database is connected

    const body = await req.json(); // Parse the incoming JSON body

    // Create a new staff record
    const newStaff = await Staff.create(body);

    return NextResponse.json(
      { success: true, data: newStaff },
      { status: 201 } // HTTP 201 Created
    );
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create staff" },
      { status: 500 } // HTTP 500 Internal Server Error
    );
  }
}
