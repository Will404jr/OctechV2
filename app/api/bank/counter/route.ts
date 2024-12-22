import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Counter } from "@/lib/models/bank";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeCounter = await Counter.findOne({
      userId: session.userId,
      isActive: true,
    }).populate("queueId");

    return NextResponse.json({ counter: activeCounter }, { status: 200 });
  } catch (error) {
    console.error("Error fetching counter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { counterNumber, queueId } = await request.json();

    if (!counterNumber || !queueId) {
      return NextResponse.json(
        { error: "Counter number and queue ID are required" },
        { status: 400 }
      );
    }

    // Deactivate the current active counter for this user
    await Counter.findOneAndUpdate(
      { userId: session.userId, isActive: true },
      { isActive: false }
    );

    // Create or update the counter for this user
    const updatedCounter = await Counter.findOneAndUpdate(
      { userId: session.userId, counterNumber: counterNumber },
      {
        userId: session.userId,
        counterNumber: counterNumber,
        queueId: queueId,
        isActive: true,
      },
      { new: true, upsert: true }
    ).populate("queueId");

    if (!updatedCounter) {
      return NextResponse.json(
        { error: "Failed to update counter" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, counter: updatedCounter },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating counter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
