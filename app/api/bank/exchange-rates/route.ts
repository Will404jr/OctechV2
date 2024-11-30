import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { ExchangeRate } from "@/lib/models/bank";
import mongoose from "mongoose";

export async function GET() {
  try {
    await dbConnect();
    const rates = await ExchangeRate.find({}).sort({ updatedAt: -1 });
    return NextResponse.json(rates);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Connect to the database
    await dbConnect();

    // Parse the request body
    const body = await req.json();
    console.log("Received data:", body);

    // Validate required fields
    const { countryName, countryCode, currencyCode, buyingRate, sellingRate } =
      body;

    if (
      !countryName ||
      !countryCode ||
      !currencyCode ||
      buyingRate == null ||
      sellingRate == null
    ) {
      console.error("Validation failed: Missing fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a new ExchangeRate document
    const newExchangeRate = new ExchangeRate({
      countryName,
      countryCode,
      currencyCode,
      buyingRate,
      sellingRate,
    });

    // Save the document to the database
    const savedExchangeRate = await newExchangeRate.save();

    console.log("Exchange rate saved:", savedExchangeRate);

    return NextResponse.json(
      {
        message: "Exchange rate created successfully",
        exchangeRate: savedExchangeRate,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      console.error("Validation error:", error.message);
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    } else if (error instanceof Error) {
      console.error("Unexpected error:", error.message);
      return NextResponse.json(
        { error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    } else {
      console.error("Unknown error:", error);
      return NextResponse.json(
        { error: "An unexpected error occurred" },
        { status: 500 }
      );
    }
  }
}
