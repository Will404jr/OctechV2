import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Department } from "@/lib/models/hospital";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = context.params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    // Find department
    const department = await Department.findById(id);
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Filter rooms by date if provided
    let rooms = department.rooms;
    if (date) {
      // If date is provided, only return rooms created on that date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      rooms = department.rooms.filter((room: any) => {
        const roomDate = new Date(room.createdAt);
        return roomDate >= startOfDay && roomDate <= endOfDay;
      });
    }

    return NextResponse.json({
      departmentId: id,
      departmentTitle: department.title,
      rooms: rooms,
    });
  } catch (error) {
    console.error("Error fetching department rooms:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
