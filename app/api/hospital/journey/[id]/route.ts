import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { Journey } from "@/lib/models/hospital";
import dbConnect from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;
    const deletedJourney = await Journey.findByIdAndDelete(id);

    if (!deletedJourney) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Journey deleted successfully" });
  } catch (error) {
    console.error("Failed to delete journey:", error);
    return NextResponse.json(
      { error: "Failed to delete journey" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await request.json();

    // Validate the incoming data
    if (!body.name || !body.steps || !Array.isArray(body.steps)) {
      return NextResponse.json(
        { error: "Invalid journey data" },
        { status: 400 }
      );
    }

    // Find the journey by ID and update it
    const updatedJourney = await Journey.findByIdAndUpdate(
      id,
      { name: body.name, steps: body.steps, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedJourney) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    return NextResponse.json(updatedJourney);
  } catch (error) {
    console.error("Failed to update journey:", error);
    return NextResponse.json(
      { error: "Failed to update journey" },
      { status: 500 }
    );
  }
}
