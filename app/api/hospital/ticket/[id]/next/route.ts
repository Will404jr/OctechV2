import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket, Department } from "@/lib/models/hospital";
import { calculateDurationInSeconds } from "@/lib/utils/time-tracking";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();
    const body = await req.json();
    const { nextDepartmentId, departmentNote, currentDepartment, roomId } =
      body;

    console.log(
      `Processing next step for ticket ${id} from ${currentDepartment} to department ID: ${nextDepartmentId}`
    );

    // Validate input
    if (!nextDepartmentId || !currentDepartment) {
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
    const nextDepartment = await Department.findById(nextDepartmentId);
    if (!nextDepartment) {
      return NextResponse.json(
        { error: "Next department not found" },
        { status: 404 }
      );
    }

    // Find current department to get its icon
    const currentDepartmentData = await Department.findOne({
      title: currentDepartment,
    });
    const currentDepartmentIcon = currentDepartmentData
      ? currentDepartmentData.icon
      : "";

    console.log(`Target department: ${nextDepartment.title}`);

    // Initialize departmentHistory if it doesn't exist
    if (!ticket.departmentHistory) {
      ticket.departmentHistory = [];
    }

    const now = new Date();

    // Check if current department is already in history but not completed
    const currentDeptIndex = ticket.departmentHistory.findIndex(
      (hist: any) => hist.department === currentDepartment && !hist.completed
    );

    if (currentDeptIndex >= 0) {
      // Update the existing entry
      ticket.departmentHistory[currentDeptIndex].note = departmentNote || "";
      ticket.departmentHistory[currentDeptIndex].completed = true;
      ticket.departmentHistory[currentDeptIndex].completedAt = now;

      // Calculate processing duration if startedAt exists
      if (ticket.departmentHistory[currentDeptIndex].startedAt) {
        const processingDuration = calculateDurationInSeconds(
          ticket.departmentHistory[currentDeptIndex].startedAt,
          now
        );

        // Subtract hold duration if any
        const holdDuration =
          ticket.departmentHistory[currentDeptIndex].holdDuration || 0;
        ticket.departmentHistory[currentDeptIndex].processingDuration =
          processingDuration - holdDuration;

        console.log(
          `Department ${currentDepartment} processing time: ${processingDuration} seconds (minus ${holdDuration} seconds on hold)`
        );
      }

      // Add the roomId of the current user to the history if not already set
      if (roomId && !ticket.departmentHistory[currentDeptIndex].roomId) {
        ticket.departmentHistory[currentDeptIndex].roomId = roomId;
      }

      console.log(`Marked department ${currentDepartment} as completed`);
    } else {
      // Add current department to history with completed status
      ticket.departmentHistory.push({
        department: currentDepartment,
        icon: currentDepartmentIcon,
        timestamp: now,
        startedAt: now, // Assume started now
        completedAt: now,
        processingDuration: 0, // Instant completion
        note: departmentNote || "",
        completed: true,
        roomId: roomId,
        holdDuration: 0,
      });

      console.log(
        `Added department ${currentDepartment} to history as completed with icon ${currentDepartmentIcon}`
      );
    }

    // Add next department to history (not completed yet)
    ticket.departmentHistory.push({
      department: nextDepartment.title,
      icon: nextDepartment.icon,
      timestamp: now,
      startedAt: null,
      completedAt: null,
      processingDuration: 0,
      note: "",
      completed: false,
      holdDuration: 0,
    });

    console.log(
      `Added department ${nextDepartment.title} to history as not completed with icon ${nextDepartment.icon}`
    );

    console.log(`Updated departmentHistory:`, ticket.departmentHistory);

    // Reset call flag
    ticket.call = false;

    // Reset held flag if it was held
    if (ticket.held) {
      ticket.held = false;
    }

    await ticket.save();
    console.log(`Ticket saved with updated history`);

    console.log(
      `Ticket ${id} successfully moved from ${currentDepartment} to ${nextDepartment.title}`
    );
    return NextResponse.json({ success: true, ticket }, { status: 200 });
  } catch (error) {
    console.error("Error moving ticket to next department:", error);
    return NextResponse.json(
      { error: "Failed to move ticket to next department" },
      { status: 500 }
    );
  }
}
