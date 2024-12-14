"use server";

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Room } from "@/lib/models/hospital";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const data = await req.json();
    const room = await Room.findByIdAndUpdate(params.id, data, {
      new: true,
    });

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating room" },
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
    const room = await Room.findByIdAndDelete(params.id);

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting room" },
      { status: 500 }
    );
  }
}
