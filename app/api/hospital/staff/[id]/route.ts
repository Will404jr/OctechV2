"use server";

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Staff } from "@/lib/models/hospital";
import dbConnect from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await request.json();

    const updatedStaff = await Staff.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate("role");

    if (!updatedStaff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const rate = await Staff.findByIdAndDelete(params.id);

    if (!rate) {
      return NextResponse.json({ message: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Staff deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting staff" },
      { status: 500 }
    );
  }
}
