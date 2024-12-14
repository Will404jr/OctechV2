import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Room } from "@/lib/models/hospital";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeRoom = await Room.findOne({
      staffId: session.userId,
      isActive: true,
    }).populate("queueId");

    return NextResponse.json({ room: activeRoom }, { status: 200 });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomNumber, queueId } = await request.json();

    if (!roomNumber || !queueId) {
      return NextResponse.json(
        { error: "Room number and queue ID are required" },
        { status: 400 }
      );
    }

    // Deactivate the current active room for this staff member
    await Room.findOneAndUpdate(
      { staffId: session.userId, isActive: true },
      { isActive: false }
    );

    // Create or update the room for this staff member
    const updatedRoom = await Room.findOneAndUpdate(
      { staffId: session.userId, roomNumber: roomNumber },
      {
        staffId: session.userId,
        roomNumber: roomNumber,
        queueId: queueId,
        isActive: true,
      },
      { new: true, upsert: true }
    ).populate("queueId");

    if (!updatedRoom) {
      return NextResponse.json(
        { error: "Failed to update room" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, room: updatedRoom },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
