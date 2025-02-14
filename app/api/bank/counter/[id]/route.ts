import { NextResponse, NextRequest } from "next/server";
import { Counter } from "@/lib/models/bank";
import dbConnect from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
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
