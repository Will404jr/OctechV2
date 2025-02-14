import { NextResponse } from "next/server";
import { Counter, Queue } from "@/lib/models/bank";
import dbConnect from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.isLoggedIn || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const counter = await Counter.findOne({
      userId: session.userId,
      createdAt: { $gte: today },
    }).populate("queueId");

    if (!counter) {
      return NextResponse.json(
        { message: "No active counter found for today" },
        { status: 200 }
      );
    }

    return NextResponse.json({ counter }, { status: 200 });
  } catch (error) {
    console.error("Error fetching counter:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.isLoggedIn || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { counterNumber, queueId } = await req.json();

    if (!counterNumber || !queueId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const queue = await Queue.findById(queueId);
    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    // Check if the counter number is already in use for this branch today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCounter = await Counter.findOne({
      counterNumber,
      branchId: session.branchId,
      createdAt: { $gte: today },
    });

    if (
      existingCounter &&
      existingCounter.userId.toString() !== session.userId
    ) {
      return NextResponse.json(
        { error: "Counter number is already in use today" },
        { status: 400 }
      );
    }

    // Create a new counter for today
    const counter = await Counter.create({
      userId: session.userId,
      counterNumber,
      queueId,
      branchId: session.branchId,
    });

    await counter.populate("queueId");

    return NextResponse.json({ counter }, { status: 200 });
  } catch (error) {
    console.error("Error updating counter:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
