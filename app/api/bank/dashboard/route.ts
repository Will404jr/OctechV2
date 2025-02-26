import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Bankticket } from "@/lib/models/bank";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { error: "Branch ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Create date range in Africa/Kampala timezone
    const timezone = "Africa/Kampala";
    const today = new Date(
      new Date().toLocaleString("en-US", { timeZone: timezone })
    );
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("Date range (Africa/Kampala):", today, tomorrow);

    const totalTickets = await Bankticket.countDocuments({
      branchId: new ObjectId(branchId),
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const ticketsServed = await Bankticket.countDocuments({
      branchId: new ObjectId(branchId),
      ticketStatus: "Served",
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const waitingTickets = await Bankticket.countDocuments({
      branchId: new ObjectId(branchId),
      ticketStatus: "Not Served",
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const inProgressTickets = await Bankticket.countDocuments({
      branchId: new ObjectId(branchId),
      ticketStatus: "Serving",
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const ticketsPerHour = await Bankticket.aggregate([
      {
        $match: {
          branchId: new ObjectId(branchId),
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: {
            $hour: {
              date: "$createdAt",
              timezone: timezone,
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const ticketsPerHourArray = Array(24).fill(0);
    ticketsPerHour.forEach((item) => {
      ticketsPerHourArray[item._id] = item.count;
    });

    return NextResponse.json({
      totalTickets,
      ticketsServed,
      waitingTickets,
      inProgressTickets,
      ticketsPerHour: ticketsPerHourArray,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
