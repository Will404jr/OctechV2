import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket, Department } from "@/lib/models/hospital";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const body = await req.json();
    const {
      departmentId,
      roomId,
      userType,
      reasonForVisit,
      receptionistNote,
      departmentNote,
      currentDepartment,
    } = body;

    console.log(
      `Processing next step for ticket ${id} from ${currentDepartment} to department ID: ${departmentId}`
    );

    // Validate input
    if (!departmentId || !currentDepartment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Find target department
    const department = await Department.findById(departmentId);
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    console.log(`Target department: ${department.title}`);

    // Find current department to get its icon
    const currentDepartmentData = await Department.findOne({
      title: currentDepartment,
    });
    const currentDepartmentIcon = currentDepartmentData
      ? currentDepartmentData.icon
      : "";

    // Initialize departmentHistory if it doesn't exist
    if (!ticket.departmentHistory) {
      ticket.departmentHistory = [];
    }

    // Check if current department is already in history but not completed
    const currentDeptIndex = ticket.departmentHistory.findIndex(
      (hist: any) => hist.department === currentDepartment && !hist.completed
    );

    if (currentDeptIndex >= 0) {
      // Update the existing entry
      ticket.departmentHistory[currentDeptIndex].note = departmentNote || "";
      ticket.departmentHistory[currentDeptIndex].completed = true;
      ticket.departmentHistory[currentDeptIndex].timestamp = new Date();
      // Add the roomId of the current user to the history
      if (body.roomId) {
        ticket.departmentHistory[currentDeptIndex].roomId = body.roomId;
      }
      console.log(`Marked department ${currentDepartment} as completed`);
    } else {
      // Add current department to history with completed status
      ticket.departmentHistory.push({
        department: currentDepartment,
        icon: currentDepartmentIcon, // Add icon to history
        timestamp: new Date(),
        note: departmentNote || "",
        completed: true,
        roomId: body.roomId, // Add the roomId of the current user
      });
      console.log(
        `Added department ${currentDepartment} to history as completed with icon ${currentDepartmentIcon}`
      );
    }

    // Add next department to history (not completed yet)
    ticket.departmentHistory.push({
      department: department.title,
      icon: department.icon, // Add icon to history
      timestamp: new Date(),
      note: "",
      completed: false,
    });
    console.log(
      `Added department ${department.title} to history as not completed with icon ${department.icon}`
    );

    console.log(`Updated departmentHistory:`, ticket.departmentHistory);

    // Update ticket with user type and reason for visit if provided (from reception)
    if (userType) {
      ticket.userType = userType;
    }

    if (reasonForVisit) {
      ticket.reasonforVisit = reasonForVisit;
    }

    if (receptionistNote) {
      ticket.receptionistNote = receptionistNote;
    }

    // Reset call flag
    ticket.call = false;

    // Reset held flag if it was held
    if (ticket.held) {
      ticket.held = false;
    }

    await ticket.save();
    console.log(`Ticket saved with updated history`);

    console.log(
      `Ticket ${id} successfully moved from ${currentDepartment} to ${department.title}`
    );

    // If a specific room was selected, update that room
    if (roomId) {
      const departmentToUpdate = await Department.findById(departmentId);
      if (!departmentToUpdate) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 }
        );
      }

      const roomIndex = departmentToUpdate.rooms.findIndex(
        (room: any) => room._id.toString() === roomId
      );

      if (roomIndex === -1) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }

      // Update room with ticket
      departmentToUpdate.rooms[roomIndex].currentTicket = ticket._id;
      departmentToUpdate.rooms[roomIndex].available = false;
      await departmentToUpdate.save();
      console.log(`Updated room ${roomId} with ticket ${id}`);

      // Add the roomId to the department history entry
      const deptHistoryIndex = ticket.departmentHistory.length - 1;
      if (deptHistoryIndex >= 0) {
        ticket.departmentHistory[deptHistoryIndex].roomId = roomId;
        await ticket.save();
        console.log(
          `Added roomId ${roomId} to department history for ticket ${id}`
        );
      }
    }

    console.log(`Completed next step processing for ticket ${id}`);
    return NextResponse.json({ success: true, ticket }, { status: 200 });
  } catch (error) {
    console.error("Error assigning next step:", error);
    return NextResponse.json(
      { error: "Failed to assign next step" },
      { status: 500 }
    );
  }
}
