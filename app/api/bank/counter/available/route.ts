import { NextResponse } from "next/server";
import { Counter } from "@/lib/models/bank";
import dbConnect from "@/lib/db";
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

    // Get the start of the current day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Fetch available counters created today for the branch
    const availableCounters = await Counter.find({
      branchId: branchId,
      createdAt: { $gte: startOfDay },
      available: true, // Only get counters that are available
    })
      .populate({
        path: "queueId",
        select: "menuItem",
        populate: {
          path: "menuItem",
          select: "name",
        },
      })
      .select("counterNumber userId _id queueId");

    // Format the counter information
    const counterInfo = availableCounters.map((counter) => ({
      _id: counter._id.toString(),
      number: counter.counterNumber,
      userId: counter.userId.toString(),
      queueName: counter.queueId?.menuItem?.name || "Unknown Queue",
    }));

    return NextResponse.json({ counters: counterInfo }, { status: 200 });
  } catch (error) {
    console.error("Error fetching counter information:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
