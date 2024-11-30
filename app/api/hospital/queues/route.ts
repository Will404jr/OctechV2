import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Queue } from "@/lib/models/hospital";

export async function GET() {
  try {
    await dbConnect();
    const queues = await Queue.find({});
    return NextResponse.json(queues);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch queues" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    if (!body.department) {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.menuItems) || body.menuItems.length === 0) {
      return NextResponse.json(
        { error: "At least one menu item is required" },
        { status: 400 }
      );
    }

    // Validate menu items structure
    for (const item of body.menuItems) {
      if (!item.name) {
        return NextResponse.json(
          { error: "Each menu item must have a name" },
          { status: 400 }
        );
      }
      if (!Array.isArray(item.subItems)) {
        return NextResponse.json(
          { error: "Each menu item must have a subItems array" },
          { status: 400 }
        );
      }
    }

    const queue = await Queue.create(body);
    return NextResponse.json(queue, { status: 201 });
  } catch (error) {
    console.error("Create queue error:", error);
    return NextResponse.json(
      { error: "Failed to create queue" },
      { status: 500 }
    );
  }
}
