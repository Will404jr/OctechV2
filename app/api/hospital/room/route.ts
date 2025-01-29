import { type NextRequest, NextResponse } from "next/server";
import { Room } from "@/lib/models/hospital";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  try {
    // Use findOneAndUpdate with upsert option
    const room = await Room.findOneAndUpdate({ staffId: body.staffId }, body, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    return NextResponse.json(room);
  } catch (error: unknown) {
    if (error instanceof mongoose.Error.ValidationError) {
      // Handle validation errors
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    } else if (error instanceof mongoose.mongo.MongoError) {
      if ((error as any).code === 11000) {
        // Handle duplicate key error
        const keyPattern = (error as any).keyPattern;
        if (keyPattern?.staffId) {
          return NextResponse.json(
            { error: "A room is already assigned to this staff member" },
            { status: 409 }
          );
        } else if (keyPattern?.department && keyPattern?.roomNumber) {
          return NextResponse.json(
            {
              error: "A room with this number already exists in the department",
            },
            { status: 409 }
          );
        }
      }
    }

    // For any other errors
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to create or update room" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");

  try {
    const room = await Room.findOne({ staffId });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 }
    );
  }
}
