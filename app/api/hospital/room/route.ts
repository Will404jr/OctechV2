import { type NextRequest, NextResponse } from "next/server";
import { Room } from "@/lib/models/hospital";
import dbConnect from "@/lib/db";

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  try {
    const room = new Room(body);
    await room.save();
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create room" },
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
