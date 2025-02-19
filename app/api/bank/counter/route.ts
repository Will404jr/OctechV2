import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Counter } from "@/lib/models/bank";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    const { queueId, counterNumber } = await request.json();

    if (!session.userId || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counter = new Counter({
      userId: session.userId,
      counterNumber: Number(counterNumber),
      queueId,
      branchId: session.branchId,
    });

    await counter.save();

    // Update the session with the new counterId
    session.counterId = counter._id.toString();
    await session.save();

    return NextResponse.json({ success: true, counter }, { status: 201 });
  } catch (error) {
    console.error("Counter creation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    const { queueId, counterNumber, available } = await request.json();

    if (!session.userId || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let counter;

    if (session.counterId) {
      // Update existing counter
      counter = await Counter.findByIdAndUpdate(
        session.counterId,
        {
          counterNumber: Number(counterNumber),
          queueId,
          available: available !== undefined ? available : undefined,
        },
        { new: true }
      );
    } else {
      // Create new counter
      counter = new Counter({
        userId: session.userId,
        counterNumber: Number(counterNumber),
        queueId,
        branchId: session.branchId,
        available: available !== undefined ? available : false,
      });
      await counter.save();
    }

    // Update the session with the counterId
    session.counterId = counter._id.toString();
    await session.save();

    return NextResponse.json({ success: true, counter }, { status: 200 });
  } catch (error) {
    console.error("Counter update error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.userId || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counter = await Counter.findOne({ userId: session.userId }).populate(
      "queueId"
    );

    if (!counter) {
      return NextResponse.json({ error: "Counter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, counter }, { status: 200 });
  } catch (error) {
    console.error("Counter fetch error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
