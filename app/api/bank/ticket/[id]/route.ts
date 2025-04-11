import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Bankticket, Counter } from "@/lib/models/bank";
import { getSession } from "@/lib/session";
import type { IBankTicket } from "@/types/bank";
import { Types } from "mongoose";

// Helper function to calculate duration in seconds between two dates
function calculateDurationInSeconds(
  startDate: Date | null,
  endDate: Date
): number {
  if (!startDate) return 0;
  return Math.round((endDate.getTime() - new Date(startDate).getTime()) / 1000);
}

// Helper function to format duration in minutes and seconds
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();

    const session = await getSession();
    console.log("Session data:", session);

    if (!session.isLoggedIn) {
      console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("Received update request for ticket:", id, "with data:", body);

    // First, get the current ticket to compare status
    const currentTicket = (await Bankticket.findById(
      id
    ).lean()) as IBankTicket | null;
    if (!currentTicket) {
      console.error("Ticket not found:", id);
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    const updateData: Partial<IBankTicket> = {};
    const now = new Date();
    const previousStatus = currentTicket.ticketStatus;

    console.log("Previous status:", previousStatus);
    console.log("Current ticket data:", currentTicket);

    // Handle status change and update timestamps and durations
    if (body.ticketStatus && body.ticketStatus !== previousStatus) {
      updateData.ticketStatus =
        body.ticketStatus as IBankTicket["ticketStatus"];
      console.log(
        `Status changing from ${previousStatus} to ${body.ticketStatus}`
      );

      // Calculate duration for the previous status
      if (previousStatus === "Not Served" && currentTicket.notServedAt) {
        const notServedDuration = calculateDurationInSeconds(
          currentTicket.notServedAt,
          now
        );
        updateData.notServedDuration = notServedDuration;
        console.log(
          `Not Served duration calculated: ${formatDuration(
            notServedDuration
          )} (${notServedDuration} seconds)`
        );
      } else if (previousStatus === "Serving" && currentTicket.servingAt) {
        const currentServingDuration = calculateDurationInSeconds(
          currentTicket.servingAt,
          now
        );
        const previousServingDuration = currentTicket.servingDuration || 0;
        updateData.servingDuration =
          previousServingDuration + currentServingDuration;
        console.log(
          `Serving duration calculated: ${formatDuration(
            previousServingDuration
          )} + ${formatDuration(currentServingDuration)} = ${formatDuration(
            updateData.servingDuration
          )} (${updateData.servingDuration} seconds)`
        );
      } else if (previousStatus === "Hold" && currentTicket.holdAt) {
        const currentHoldDuration = calculateDurationInSeconds(
          currentTicket.holdAt,
          now
        );
        const previousHoldDuration = currentTicket.holdDuration || 0;
        updateData.holdDuration = previousHoldDuration + currentHoldDuration;
        console.log(
          `Hold duration calculated: ${formatDuration(
            previousHoldDuration
          )} + ${formatDuration(currentHoldDuration)} = ${formatDuration(
            updateData.holdDuration
          )} (${updateData.holdDuration} seconds)`
        );
      }

      // Set timestamp for the new status
      if (body.ticketStatus === "Serving") {
        updateData.servingAt = now;
        console.log("Setting servingAt timestamp:", now);

        const activeCounter = await Counter.findOne({ userId: session.userId });
        if (activeCounter) {
          updateData.counterId = activeCounter._id;
        } else {
          console.error("No active counter found for user:", session.userId);
          return NextResponse.json(
            { success: false, error: "No active counter found for the user" },
            { status: 400 }
          );
        }
      } else if (body.ticketStatus === "Hold") {
        updateData.holdAt = now;
        console.log("Setting holdAt timestamp:", now);
      } else if (body.ticketStatus === "Served") {
        updateData.servedAt = now;
        console.log("Setting servedAt timestamp:", now);

        // Calculate total duration when ticket is served
        let totalDuration = currentTicket.notServedDuration || 0;

        // Add serving duration
        if (previousStatus === "Serving" && currentTicket.servingAt) {
          const finalServingDuration = calculateDurationInSeconds(
            currentTicket.servingAt,
            now
          );
          const previousServingDuration = currentTicket.servingDuration || 0;
          updateData.servingDuration =
            previousServingDuration + finalServingDuration;
          totalDuration += updateData.servingDuration;
          console.log(
            `Final serving duration: ${formatDuration(
              previousServingDuration
            )} + ${formatDuration(finalServingDuration)} = ${formatDuration(
              updateData.servingDuration
            )}`
          );
        } else {
          totalDuration += currentTicket.servingDuration || 0;
        }

        // Add hold duration
        totalDuration += currentTicket.holdDuration || 0;
        updateData.totalDuration = totalDuration;
        console.log(
          `Total duration calculated: ${formatDuration(
            totalDuration
          )} (${totalDuration} seconds)`
        );
      }
    }

    // Handle other fields
    if (body.queueId) updateData.queueId = new Types.ObjectId(body.queueId);
    if (body.subItemId)
      updateData.subItemId = new Types.ObjectId(body.subItemId);
    if (body.issueDescription)
      updateData.issueDescription = body.issueDescription;
    if (body.callAgain !== undefined) updateData.callAgain = body.callAgain;
    if (body.justifyReason !== undefined)
      updateData.justifyReason = body.justifyReason;

    // Handle redirect scenario
    if (body.counterId) {
      updateData.counterId = new Types.ObjectId(body.counterId);

      // If status is changing to Serving, update the timestamp
      if (previousStatus !== "Serving") {
        updateData.ticketStatus = "Serving";
        updateData.servingAt = now;

        // Calculate not served duration if coming from Not Served
        if (previousStatus === "Not Served" && currentTicket.notServedAt) {
          updateData.notServedDuration = calculateDurationInSeconds(
            currentTicket.notServedAt,
            now
          );
        }
        // Calculate hold duration if coming from Hold
        else if (previousStatus === "Hold" && currentTicket.holdAt) {
          const currentHoldDuration = calculateDurationInSeconds(
            currentTicket.holdAt,
            now
          );
          updateData.holdDuration =
            (currentTicket.holdDuration || 0) + currentHoldDuration;
        }
      }
    }

    console.log("Updating ticket with data:", updateData);

    // Use runValidators to ensure schema validation runs on update
    const updatedTicket = await Bankticket.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("counterId");

    if (!updatedTicket) {
      console.error("Ticket not found after update:", id);
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
