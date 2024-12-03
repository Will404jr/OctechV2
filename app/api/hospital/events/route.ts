import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Event } from "@/lib/models/hospital";

export async function GET() {
  try {
    await dbConnect();
    const events = await Event.find({});
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect(); // Ensure the database is connected

    const body = await req.json(); // Parse the incoming JSON body

    // Create a new branch record
    const newEvent = await Event.create(body);

    return NextResponse.json(
      { success: true, data: newEvent },
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
