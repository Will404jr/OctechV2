import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Department } from "@/lib/models/hospital";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { staffId, department, roomNumber, available = false } = body;

    // Validate input
    if (!staffId || !department || !roomNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find or create department
    let departmentDoc = await Department.findOne({ title: department });

    if (!departmentDoc) {
      // Get icon from the departments array
      const { default: departmentsData } = await import("@/data/departments");
      const deptData = departmentsData.find((d) => d.title === department);

      if (!deptData) {
        return NextResponse.json(
          { error: "Department not found in reference data" },
          { status: 404 }
        );
      }

      departmentDoc = await Department.create({
        title: department,
        icon: deptData.icon,
        rooms: [],
      });
    }

    // Check if room number already exists in this department
    const roomExists = departmentDoc.rooms.some(
      (room: any) => room.roomNumber === roomNumber
    );

    if (roomExists) {
      return NextResponse.json(
        { error: "A room with this number already exists in the department" },
        { status: 409 }
      );
    }

    // Add room to department
    const newRoom = {
      roomNumber,
      staff: staffId,
      available,
      currentTicket: null,
    };

    departmentDoc.rooms.push(newRoom);
    await departmentDoc.save();

    // Get the newly created room
    const createdRoom = departmentDoc.rooms[departmentDoc.rooms.length - 1];

    return NextResponse.json(
      {
        _id: createdRoom._id,
        roomNumber: createdRoom.roomNumber,
        staff: createdRoom.staff,
        available: createdRoom.available,
        currentTicket: createdRoom.currentTicket,
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
