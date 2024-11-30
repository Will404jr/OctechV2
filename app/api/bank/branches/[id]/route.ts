"use server";

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Branch } from "@/lib/models/bank";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const data = await req.json();
    const rate = await Branch.findByIdAndUpdate(params.id, data, {
      new: true,
    });

    if (!rate) {
      return NextResponse.json(
        { message: "Branch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rate);
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating branch" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const rate = await Branch.findByIdAndDelete(params.id);

    if (!rate) {
      return NextResponse.json(
        { message: "Branch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Branch deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting branch" },
      { status: 500 }
    );
  }
}
