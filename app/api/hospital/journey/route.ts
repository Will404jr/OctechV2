import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { Journey } from "@/lib/models/hospital";
import dbConnect from "@/lib/db";

export async function GET() {
  try {
    await dbConnect();
    const journeys = await Journey.find({}).sort({ createdAt: -1 });
    return NextResponse.json(journeys);
  } catch (error) {
    console.error("Failed to fetch journeys:", error);
    return NextResponse.json(
      { error: "Failed to fetch journeys" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const newJourney = new Journey(body);
    await newJourney.save();
    return NextResponse.json(newJourney, { status: 201 });
  } catch (error) {
    console.error("Failed to create journey:", error);
    return NextResponse.json(
      { error: "Failed to create journey" },
      { status: 500 }
    );
  }
}
