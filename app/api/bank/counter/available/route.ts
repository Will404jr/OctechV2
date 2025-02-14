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

    // Fetch all counters created for the current day and branch
    const createdCounters = await Counter.find({
      branchId: branchId,
      createdAt: { $gte: startOfDay },
    }).select("counterNumber userId _id");

    // Extract the counter numbers, user IDs, and counter IDs
    const createdCounterInfo = createdCounters.map((counter) => ({
      number: counter.counterNumber,
      userId: counter.userId.toString(),
      _id: counter._id.toString(),
    }));

    // Generate all possible counter numbers (1-50)
    const allCounterNumbers = Array.from({ length: 50 }, (_, i) => i + 1);

    // Filter out the created counter numbers to get available counter numbers
    const availableCounters = allCounterNumbers.filter(
      (num) => !createdCounterInfo.some((c) => c.number === num)
    );

    return NextResponse.json(
      { availableCounters, createdCounters: createdCounterInfo },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching counter information:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
