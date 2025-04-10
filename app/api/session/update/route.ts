import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { department, roomId } = body;

    const session = await getSession();

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Update session with department and room info
    if (department) {
      session.department = department;
    }

    if (roomId) {
      session.roomId = roomId;
    }

    await session.save();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Session update error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
