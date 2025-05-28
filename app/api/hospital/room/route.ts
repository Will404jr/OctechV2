import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Department } from "@/lib/models/hospital";
import { Staff } from "@/lib/models/hospital";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const {
      staffId,
      department: departmentId,
      roomNumber,
      available = false,
      date,
    } = body;

    // Validate input
    if (!staffId || !departmentId || !roomNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Find department
    const department = await Department.findById(departmentId);
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Check if room number already exists in this department for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const roomExists = department.rooms.some((room: any) => {
      const roomDate = new Date(room.createdAt);
      return (
        room.roomNumber === roomNumber &&
        roomDate >= today &&
        roomDate < tomorrow
      );
    });

    if (roomExists) {
      return NextResponse.json(
        {
          error:
            "A room with this number already exists in the department for today",
        },
        { status: 409 }
      );
    }

    // REMOVED: The check that prevents staff from having multiple rooms per day
    // This allows staff to have multiple rooms as long as room numbers are unique

    // Add room to department
    const newRoom = {
      roomNumber,
      staff: staffId,
      available,
      currentTicket: null,
      // createdAt will be automatically set to now
    };

    department.rooms.push(newRoom);
    await department.save();

    // Get the newly created room
    const createdRoom = department.rooms[department.rooms.length - 1];

    return NextResponse.json(
      {
        success: true,
        roomId: createdRoom._id,
        roomNumber: createdRoom.roomNumber,
        staff: createdRoom.staff,
        available: createdRoom.available,
        departmentId: department._id,
        departmentTitle: department.title,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create room" },
      { status: 500 }
    );
  }
}