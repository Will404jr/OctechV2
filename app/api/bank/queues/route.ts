import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Queue } from "@/lib/models/bank";

// CORS middleware
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  try {
    await dbConnect();
    const queues = await Queue.find({});
    const response = NextResponse.json(queues);
    return setCorsHeaders(response);
  } catch (error) {
    const response = NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    );
    return setCorsHeaders(response);
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect(); // Ensure database connection

    const body = await req.json(); // Parse incoming JSON

    // Validate menuItem
    if (
      !body.menuItem ||
      typeof body.menuItem.name !== "string" ||
      !Array.isArray(body.menuItem.subMenuItems) ||
      !body.menuItem.subMenuItems.every(
        (subMenuItem: { name: any }) =>
          subMenuItem.name && typeof subMenuItem.name === "string"
      )
    ) {
      const response = NextResponse.json(
        {
          success: false,
          error: "Invalid or missing 'menuItem' or 'subMenuItems'",
        },
        { status: 400 } // HTTP 400 Bad Request
      );
      return setCorsHeaders(response);
    }

    // Create a new queue document
    const newQueue = await Queue.create(body);

    const response = NextResponse.json(
      { success: true, data: newQueue },
      { status: 201 } // HTTP 201 Created
    );
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Error creating queue:", error);

    let response;
    if (error instanceof Error) {
      response = NextResponse.json(
        { success: false, error: error.message },
        { status: 500 } // HTTP 500 Internal Server Error
      );
    } else {
      response = NextResponse.json(
        { success: false, error: "An unknown error occurred" },
        { status: 500 }
      );
    }
    return setCorsHeaders(response);
  }
}
