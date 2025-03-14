import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket } from "@/lib/models/hospital";

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
      reasonForVisit,
      receptionistNote,
      departmentNote,
      currentDepartment,
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

    // Initialize departmentHistory if it doesn't exist
    if (!ticket.departmentHistory) {
      ticket.departmentHistory = [];
    }

    // Find if this department is already in history but not completed
    const existingDeptIndex = ticket.departmentHistory.findIndex(
      (hist: any) => hist.department === currentDepartment && !hist.completed
    );

    if (existingDeptIndex >= 0) {
      // Update the existing entry
      ticket.departmentHistory[existingDeptIndex].note = departmentNote || "";
      ticket.departmentHistory[existingDeptIndex].completed = true;
      ticket.departmentHistory[existingDeptIndex].timestamp = new Date();
      console.log(`Marked department ${currentDepartment} as completed`);
    } else {
      // Add current department to history with completed status
      ticket.departmentHistory.push({
        department: currentDepartment,
        timestamp: new Date(),
        note: departmentNote || "",
        completed: true,
      });
      console.log(
        `Added department ${currentDepartment} to history as completed`
      );
    }

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

    // Check if all departments in history are completed
    const allDepartmentsCompleted = ticket.departmentHistory.every(
      (hist: any) => hist.completed
    );

    // Mark ticket as completed if all departments are completed
    if (allDepartmentsCompleted) {
      ticket.completed = true;
      console.log(`All departments completed, marking ticket as completed`);
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
