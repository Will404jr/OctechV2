import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket } from "@/lib/models/ticket";
import { getSession } from "@/lib/session";
import { Room } from "@/lib/models/hospital";

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
      roomId?: string | null;
      callAgain?: boolean;
    } = {};

    if (body.ticketStatus) {
      updateData.ticketStatus = body.ticketStatus;

      // If the new status is "Serving", assign the user's active room
      if (body.ticketStatus === "Serving") {
        const activeRoom = await Room.findOne({
          staffId: session.userId,
          isActive: true,
        });
        if (activeRoom) {
          updateData.roomId = activeRoom._id;
        } else {
          return NextResponse.json(
            { success: false, error: "No active room found for the user" },
            { status: 400 }
          );
        }
      }
    }

    if (body.queueId) {
      updateData.queueId = body.queueId;
      updateData.subItemId = body.subItemId;
      updateData.ticketStatus = "Not Served"; // Reset status when queue changes
      updateData.issueDescription = body.issueDescription;
      updateData.roomId = null; // Reset roomId when queue changes
    }

    if (body.callAgain !== undefined) {
      updateData.callAgain = body.callAgain;
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("roomId");

    if (!updatedTicket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedTicket });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { success: false, error: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
