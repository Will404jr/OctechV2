import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket } from "@/lib/models/bank";
import { getSession } from "@/lib/session";
import { Counter } from "@/lib/models/bank";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();

    const body = await req.json();
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    if (body.callAgain) updateData.callAgain = body.callAgain;

    const updatedTicket = await Ticket.findByIdAndUpdate(id, updateData, {
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
