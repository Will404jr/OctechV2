// api/hospital/ticket/[id]/clear/route.ts

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
    const {
      userType,
      patientName,
      reasonForVisit,
      receptionistNote,
      departmentNote,
      currentDepartment,
      roomId,
    } = body;

    console.log(`Clearing ticket ${id} from department ${currentDepartment}`);

    // Validate input
    if (!currentDepartment) {
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

    const now = new Date();

    // Find if this department is already in history but not completed
    const existingDeptIndex = ticket.departmentHistory.findIndex(
      (hist: any) => hist.department === currentDepartment && !hist.completed
    );

    if (existingDeptIndex >= 0) {
      // Update the existing entry
      ticket.departmentHistory[existingDeptIndex].note = departmentNote || "";
      ticket.departmentHistory[existingDeptIndex].completed = true;
      ticket.departmentHistory[existingDeptIndex].completedAt = now;

      // Calculate processing duration if startedAt exists
      if (ticket.departmentHistory[existingDeptIndex].startedAt) {
        const processingDuration = calculateDurationInSeconds(
          ticket.departmentHistory[existingDeptIndex].startedAt,
          now
        );

        // Subtract hold duration if any
        const holdDuration =
          ticket.departmentHistory[existingDeptIndex].holdDuration || 0;
        ticket.departmentHistory[existingDeptIndex].processingDuration =
          processingDuration - holdDuration;

        console.log(
          `Department ${currentDepartment} processing time: ${processingDuration} seconds (minus ${holdDuration} seconds on hold)`
        );
      }

      // Add the roomId of the current user to the history if not already set
      if (roomId && !ticket.departmentHistory[existingDeptIndex].roomId) {
        ticket.departmentHistory[existingDeptIndex].roomId = roomId;
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

    console.log(`Updated departmentHistory:`, ticket.departmentHistory);

    // Update ticket with user type and reason for visit if provided (from reception)
    if (userType) {
      ticket.userType = userType;
    }

     if (patientName) {
      ticket.patientName = patientName;
    }

    if (reasonForVisit) {
      ticket.reasonforVisit = reasonForVisit;
    }

    if (receptionistNote) {
      ticket.receptionistNote = receptionistNote;
    }

    // Check if all departments in history are completed
    const allDepartmentsCompleted = ticket.departmentHistory.every(
      (hist: any) => hist.completed
    );

    // Mark ticket as completed if all departments are completed
    if (allDepartmentsCompleted) {
      ticket.completed = true;
      ticket.completedAt = now;

      // Calculate total duration from creation to completion
      const totalDuration = calculateDurationInSeconds(ticket.createdAt, now);
      ticket.totalDuration = totalDuration;

      console.log(
        `All departments completed, marking ticket as completed. Total duration: ${totalDuration} seconds`
      );
    }

    await ticket.save();
    console.log(
      `Ticket marked as completed for department ${currentDepartment}`
    );

    return NextResponse.json({ success: true, ticket }, { status: 200 });
  } catch (error) {
    console.error("Error clearing ticket:", error);
    return NextResponse.json(
      { error: "Failed to clear ticket" },
      { status: 500 }
    );
  }
}
