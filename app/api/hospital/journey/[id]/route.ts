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
