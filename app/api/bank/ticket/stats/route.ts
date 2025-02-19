import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Bankticket } from "@/lib/models/bank";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.isLoggedIn || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { error: "Branch ID is required" },
        { status: 400 }
      );
    }

    // First, aggregate tickets by queueId
    const ticketStats = await Bankticket.aggregate([
      {
        $match: {
          branchId: branchId,
          ticketStatus: "Not Served",
        },
      },
      {
        $group: {
          _id: "$queueId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Then populate the queue information
    const populatedStats = await Promise.all(
      ticketStats.map(async (stat) => {
        const queue = await Bankticket.findOne({ queueId: stat._id })
          .populate("queueId")
          .select("queueId");

        return {
          queueId: stat._id,
          count: stat.count,
          queueName: queue?.queueId?.menuItem?.name || "Unknown Queue",
        };
      })
    );

    console.log("Ticket stats:", populatedStats);
    return NextResponse.json({ stats: populatedStats });
  } catch (error) {
    console.error("Error fetching ticket statistics:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
