"use server";

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ExchangeRate } from "@/lib/models/bank";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    await connectDB();
    const data = await req.json();
    const rate = await ExchangeRate.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!rate) {
      return NextResponse.json(
        { message: "Exchange rate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rate);
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating exchange rate" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    await connectDB();
    const rate = await ExchangeRate.findByIdAndDelete(id);

    if (!rate) {
      return NextResponse.json(
        { message: "Exchange rate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Exchange rate deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting exchange rate" },
      { status: 500 }
    );
  }
}
