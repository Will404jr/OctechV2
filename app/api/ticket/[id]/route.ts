import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket } from "@/lib/models/ticket";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = await req.json();

    const updateData: {
      ticketStatus?: string;
      queueId?: string;
      subItemId?: string;
      issueDescription?: string;
    } = {};

    if (body.ticketStatus) updateData.ticketStatus = body.ticketStatus;
    if (body.queueId) {
      updateData.queueId = body.queueId;
      updateData.subItemId = body.subItemId;
      updateData.ticketStatus = "Not Served"; // Reset status when queue changes
      updateData.issueDescription = body.issueDescription; // Update issueDescription
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(id, updateData, {
      new: true,
    });

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
