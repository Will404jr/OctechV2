import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Branch } from "@/lib/models/bank";

export async function GET() {
  try {
    await dbConnect();
    const branches = await Branch.find({});
    return NextResponse.json(branches);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect(); // Ensure the database is connected

    const body = await req.json(); // Parse the incoming JSON body

    // Create a new branch record
    const newBranch = await Branch.create(body);

    return NextResponse.json(
      { success: true, data: newBranch },
      { status: 201 } // HTTP 201 Created
    );
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create branch" },
      { status: 500 } // HTTP 500 Internal Server Error
    );
  }
}
