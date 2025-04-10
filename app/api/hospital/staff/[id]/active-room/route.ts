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
    const staffId = id;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find any department with a room assigned to this staff today
    const departmentsWithStaff = await Department.find({
      "rooms.staff": staffId,
      "rooms.createdAt": { $gte: today, $lt: tomorrow },
    }).populate({
      path: "rooms.staff",
      select: "firstName lastName username",
      match: { _id: staffId },
    });

    let activeRoom = null;
    let departmentInfo = null;

    // Find the active room for this staff
    for (const dept of departmentsWithStaff) {
      const staffRoom = dept.rooms.find((room: any) => {
        return (
          room.staff &&
          room.staff._id.toString() === staffId &&
          new Date(room.createdAt) >= today &&
          new Date(room.createdAt) < tomorrow
        );
      });

      if (staffRoom) {
        activeRoom = staffRoom;
        departmentInfo = {
          _id: dept._id,
          title: dept.title,
          icon: dept.icon,
        };
        break;
      }
    }

    if (activeRoom) {
      return NextResponse.json({
        hasActiveRoom: true,
        room: {
          _id: activeRoom._id,
          roomNumber: activeRoom.roomNumber,
          available: activeRoom.available,
          createdAt: activeRoom.createdAt,
        },
        department: departmentInfo,
      });
    } else {
      return NextResponse.json({
        hasActiveRoom: false,
      });
    }
  } catch (error) {
    console.error("Error checking active room:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
