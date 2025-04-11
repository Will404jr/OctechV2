import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Bankticket } from "@/lib/models/bank";

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query: any = { ticketStatus: "Served" };

    if (branchId) query.branchId = branchId;

    // Add date range filter if provided
    if (startDate || endDate) {
      query.servedAt = {};
      if (startDate) query.servedAt.$gte = new Date(startDate);
      if (endDate) query.servedAt.$lte = new Date(endDate);
    }

    // Get all served tickets with their durations
    const tickets = await Bankticket.find(query).select({
      ticketNo: 1,
      notServedDuration: 1,
      servingDuration: 1,
      holdDuration: 1,
      totalDuration: 1,
      createdAt: 1,
      servedAt: 1,
    });

    // Calculate average durations
    let totalNotServed = 0;
    let totalServing = 0;
    let totalHold = 0;
    let totalDuration = 0;

    tickets.forEach((ticket) => {
      totalNotServed += ticket.notServedDuration || 0;
      totalServing += ticket.servingDuration || 0;
      totalHold += ticket.holdDuration || 0;
      totalDuration += ticket.totalDuration || 0;
    });

    const count = tickets.length;

    const stats = {
      count,
      averages: {
        notServedDuration: count > 0 ? Math.round(totalNotServed / count) : 0,
        servingDuration: count > 0 ? Math.round(totalServing / count) : 0,
        holdDuration: count > 0 ? Math.round(totalHold / count) : 0,
        totalDuration: count > 0 ? Math.round(totalDuration / count) : 0,
      },
      tickets,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching ticket statistics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ticket statistics" },
      { status: 500 }
    );
  }
}
