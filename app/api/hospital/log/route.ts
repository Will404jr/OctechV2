import { type NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { Log } from "@/lib/models/hospital";

// POST endpoint to create a new log entry
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { staffId, action, details } = body;

    // Validate required fields
    if (!staffId || !action || !details) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: staffId, action, and details are required",
        },
        { status: 400 }
      );
    }

    // Validate staffId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return NextResponse.json(
        { error: "Invalid staffId format" },
        { status: 400 }
      );
    }

    // Create the log entry
    const newLog = await Log.create({
      staffId,
      action,
      details,
    });

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating log:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create log entry" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve logs with optional filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");
    const action = searchParams.get("action");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build query based on provided filters
    const query: any = {};

    if (staffId) {
      if (!mongoose.Types.ObjectId.isValid(staffId)) {
        return NextResponse.json(
          { error: "Invalid staffId format" },
          { status: 400 }
        );
      }
      query.staffId = staffId;
    }

    if (action) {
      query.action = action;
    }

    // Date range filtering
    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        // Set time to end of day for the end date
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateTime;
      }
    }

    // Get logs with pagination
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const logs = await Log.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .populate("staffId", "firstName lastName email") // Populate staff details
      .lean();

    const total = await Log.countDocuments(query);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
