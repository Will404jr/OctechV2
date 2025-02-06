import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Bankticket } from "@/lib/models/bank";
import { getSession } from "@/lib/session";
import { Counter } from "@/lib/models/bank";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();

    const session = await getSession();
    console.log("Session data:", session); // Log session data for debugging

    if (!session.isLoggedIn) {
      console.log("Unauthorized access attempt"); // Log unauthorized attempts
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("Received update request for ticket:", id, "with data:", body); // Log the received data

    const updateData: {
      ticketStatus?: string;
      queueId?: string;
      subItemId?: string;
      issueDescription?: string;
      counterId?: string | null;
      callAgain?: boolean;
    } = {};

    if (body.ticketStatus) {
      updateData.ticketStatus = body.ticketStatus;

      if (body.ticketStatus === "Serving") {
        const activeCounter = await Counter.findOne({
          userId: session.userId,
          isActive: true,
        });
        if (activeCounter) {
          updateData.counterId = activeCounter._id;
        } else {
          console.error("No active counter found for user:", session.userId);
          return NextResponse.json(
            { success: false, error: "No active counter found for the user" },
            { status: 400 }
          );
        }
      }
    }

    if (body.queueId) updateData.queueId = body.queueId;
    if (body.subItemId) updateData.subItemId = body.subItemId;
    if (body.issueDescription)
      updateData.issueDescription = body.issueDescription;
    if (body.callAgain !== undefined) updateData.callAgain = body.callAgain;

    console.log("Updating ticket with data:", updateData); // Log the data being used to update the ticket

    const updatedTicket = await Bankticket.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("counterId");

    if (!updatedTicket) {
      console.error("Ticket not found:", id);
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    console.log("Ticket updated successfully:", updatedTicket);
    return NextResponse.json({ success: true, data: updatedTicket });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { success: false, error: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
