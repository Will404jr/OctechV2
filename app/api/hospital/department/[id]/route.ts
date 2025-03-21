import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Department } from "@/lib/models/hospital";
import { Staff } from "@/lib/models/hospital";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();

    const department = await Department.findById(id)
      .populate({
        path: "rooms.staff",
        select: "firstName lastName username",
      })
      .lean();

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Ensure all rooms have the available field explicitly set
    (department as any).rooms = (department as any).rooms.map(
      (room: { available: boolean }) => ({
        ...room,
        available: room.available === true,
      })
    );

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error fetching department:", error);
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
    const body = await req.json();

    // Find and update department
    const department = await Department.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate({
      path: "rooms.staff",
      select: "firstName lastName username",
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: department });
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update department" },
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

    // Find and delete department
    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete department" },
      { status: 500 }
    );
  }
}

// Endpoint to manage rooms within a department
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const body = await req.json();
    const { action, roomId, roomData } = body;

    const department = await Department.findById(id);
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Validate staff exists if adding or updating a room
    if ((action === "addRoom" || action === "updateRoom") && roomData.staff) {
      const staff = await Staff.findById(roomData.staff);
      if (!staff) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }
    }

    // Handle different room actions
    switch (action) {
      case "addRoom":
        // Check if room number already exists
        const roomExists = department.rooms.some(
          (room: any) => room.roomNumber === roomData.roomNumber
        );
        if (roomExists) {
          return NextResponse.json(
            { error: "Room number already exists in this department" },
            { status: 409 }
          );
        }
        department.rooms.push(roomData);
        break;

      case "updateRoom":
        const roomIndex = department.rooms.findIndex(
          (room: any) => room._id.toString() === roomId
        );
        if (roomIndex === -1) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 }
          );
        }
        department.rooms[roomIndex] = {
          ...department.rooms[roomIndex].toObject(),
          ...roomData,
        };
        break;

      case "deleteRoom":
        department.rooms = department.rooms.filter(
          (room: any) => room._id.toString() !== roomId
        );
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await department.save();

    // Return populated department
    const updatedDepartment = await Department.findById(id)
      .populate({
        path: "rooms.staff",
        select: "firstName lastName username",
      })
      .lean();

    return NextResponse.json({ success: true, data: updatedDepartment });
  } catch (error) {
    console.error("Error managing department rooms:", error);
    return NextResponse.json(
      { success: false, error: "Failed to manage department rooms" },
      { status: 500 }
    );
  }
}
