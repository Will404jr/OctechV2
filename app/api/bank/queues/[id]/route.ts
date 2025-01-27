"use server";

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Queue } from "@/lib/models/bank";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await connectDB();
    const data = await req.json();
    const rate = await Queue.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!rate) {
      return NextResponse.json({ message: "Queue not found" }, { status: 404 });
    }

    return NextResponse.json(rate);
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating queue" },
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
    const rate = await Queue.findByIdAndDelete(id);

    if (!rate) {
      return NextResponse.json({ message: "Queue not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Queue deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting queue" },
      { status: 500 }
    );
  }
}
