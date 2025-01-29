import { type NextRequest, NextResponse } from "next/server";
import { Branch } from "@/lib/models/bank";
import dbConnect from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { username, password } = await req.json();

    const branch = await Branch.findOne({ hallDisplayUsername: username });

    if (!branch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await branch.compareHallDisplayPassword(password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.branchId = branch._id.toString();
    session.isLoggedIn = true;
    session.hallDisplayUsername = branch.hallDisplayUsername;
    await session.save();

    return NextResponse.json(
      { message: "Display login successful", branchId: branch._id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Display login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
