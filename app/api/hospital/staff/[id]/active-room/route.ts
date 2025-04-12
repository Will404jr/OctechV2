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
    const staffId = id;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(
      `Checking active room for staff ${staffId} between ${today.toISOString()} and ${tomorrow.toISOString()}`
    );

    // Find any department with a room assigned to this staff today
    const departmentsWithStaff = await Department.find({
      "rooms.staff": staffId,
      "rooms.createdAt": { $gte: today, $lt: tomorrow },
    }).populate({
      path: "rooms.staff",
      select: "firstName lastName username",
      match: { _id: staffId },
    });

    console.log(
      `Found ${departmentsWithStaff.length} departments with rooms for staff ${staffId} today`
    );

    let activeRoom = null;
    let departmentInfo = null;

    // Find the active room for this staff
    for (const dept of departmentsWithStaff) {
      console.log(`Checking department: ${dept.title} for staff rooms`);

      const staffRoom = dept.rooms.find((room: any) => {
        const roomCreatedAt = new Date(room.createdAt);
        const isToday = roomCreatedAt >= today && roomCreatedAt < tomorrow;
        const isStaffRoom =
          room.staff && room.staff._id && room.staff._id.toString() === staffId;

        if (isStaffRoom && isToday) {
          console.log(
            `Found room ${
              room.roomNumber
            } created at ${roomCreatedAt.toISOString()}`
          );
        }

        return isStaffRoom && isToday;
      });

      if (staffRoom) {
        activeRoom = staffRoom;
        departmentInfo = {
          _id: dept._id,
          title: dept.title,
          icon: dept.icon,
        };
        console.log(
          `Active room found in department: ${dept.title}, room number: ${staffRoom.roomNumber}`
        );
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
      console.log(`No active room found for staff ${staffId} today`);
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
