import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Department } from "@/lib/models/hospital";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    console.log(`Fetching rooms for department ${id}, date filter: ${date}`);

    // Find department
    const department = await Department.findById(id).populate({
      path: "rooms.staff",
      select: "firstName lastName",
    });

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

      console.log(
        `Filtering rooms between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`
      );

      rooms = department.rooms.filter((room: any) => {
        const roomDate = new Date(room.createdAt);
        return roomDate >= startOfDay && roomDate <= endOfDay;
      });

      console.log(`Found ${rooms.length} rooms created today`);
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
