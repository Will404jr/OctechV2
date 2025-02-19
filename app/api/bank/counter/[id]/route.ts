import { NextResponse, type NextRequest } from "next/server";
import { Counter } from "@/lib/models/bank";
import dbConnect from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = context.params;
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.isLoggedIn || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counter = await Counter.findById(id).populate("queueId");

    if (!counter) {
      return NextResponse.json({ error: "Counter not found" }, { status: 404 });
    }

    // Check if the user has permission to access this counter
    if (counter.branchId.toString() !== session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = context.params;
  try {
    await dbConnect();
    const session = await getSession();
    const body = await req.json();

    if (!session.isLoggedIn || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counter = await Counter.findById(id);

    if (!counter) {
      return NextResponse.json({ error: "Counter not found" }, { status: 404 });
    }

    // Check if the user has permission to update this counter
    if (counter.branchId.toString() !== session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the new counter number is already in use
    if (body.counterNumber && body.counterNumber !== counter.counterNumber) {
      const existingCounter = await Counter.findOne({
        branchId: session.branchId,
        counterNumber: body.counterNumber,
        _id: { $ne: id }, // Exclude current counter
      });

      if (existingCounter) {
        return NextResponse.json(
          { error: "Counter number is already in use" },
          { status: 400 }
        );
      }
    }

    // Update the counter with the provided fields
    const updateData: {
      available?: boolean;
      queueId?: string;
      counterNumber?: number;
    } = {};

    if (typeof body.available === "boolean")
      updateData.available = body.available;
    if (body.queueId) updateData.queueId = body.queueId;
    if (body.counterNumber) updateData.counterNumber = body.counterNumber;

    const updatedCounter = await Counter.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("queueId");

    return NextResponse.json(
      { success: true, counter: updatedCounter },
      { status: 200 }
    );
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

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = context.params;
  try {
    await dbConnect();
    const session = await getSession();

    if (!session.isLoggedIn || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counter = await Counter.findById(id);

    if (!counter) {
      return NextResponse.json({ error: "Counter not found" }, { status: 404 });
    }

    // Check if the user has permission to delete this counter
    if (counter.branchId.toString() !== session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Counter.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Counter deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting counter:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
