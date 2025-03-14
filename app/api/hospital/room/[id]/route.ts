import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Department } from "@/lib/models/hospital";
import mongoose from "mongoose";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const roomId = id;

    // Find the department containing this room
    const department = await Department.findOne({
      "rooms._id": new mongoose.Types.ObjectId(roomId),
    }).populate("rooms.staff rooms.currentTicket");

    if (!department) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Find the specific room
    const room = department.rooms.find((r: any) => r._id.toString() === roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
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
    const roomId = id;
    const body = await req.json();
    const { roomNumber, available, currentTicket } = body;

    // Find the department containing this room
    const department = await Department.findOne({
      "rooms._id": new mongoose.Types.ObjectId(roomId),
    });

    if (!department) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Find the room index
    const roomIndex = department.rooms.findIndex(
      (r: any) => r._id.toString() === roomId
    );

    if (roomIndex === -1) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // If changing room number, check if it already exists
    if (roomNumber && roomNumber !== department.rooms[roomIndex].roomNumber) {
      const roomExists = department.rooms.some(
        (room: any, index: number) =>
          index !== roomIndex && room.roomNumber === roomNumber
      );

      if (roomExists) {
        return NextResponse.json(
          { error: "A room with this number already exists in the department" },
          { status: 409 }
        );
      }

      department.rooms[roomIndex].roomNumber = roomNumber;
    }

    // Update available status if provided
    if (available !== undefined) {
      department.rooms[roomIndex].available = available;
    }

    // Update current ticket if provided
    if (currentTicket !== undefined) {
      department.rooms[roomIndex].currentTicket = currentTicket || null;
    }

    await department.save();

    // Get the updated room
    const updatedRoom = department.rooms[roomIndex];

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json(
      { error: "Failed to update room" },
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
    await dbConnect();
    const roomId = id;

    // Find the department containing this room
    const department = await Department.findOne({
      "rooms._id": new mongoose.Types.ObjectId(roomId),
    });

    if (!department) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Remove the room
    department.rooms = department.rooms.filter(
      (r: any) => r._id.toString() !== roomId
    );

    await department.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
