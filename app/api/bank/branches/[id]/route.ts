"use server";

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Branch } from "@/lib/models/bank";
import bcrypt from "bcryptjs";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const data = await req.json();

    // Only update password fields if they are provided
    const updateData: any = { ...data };

    if (updateData.databasePassword) {
      updateData.databasePassword = await bcrypt.hash(
        updateData.databasePassword,
        10
      );
    } else {
      delete updateData.databasePassword;
    }

    if (updateData.kioskPassword) {
      updateData.kioskPassword = await bcrypt.hash(
        updateData.kioskPassword,
        10
      );
    } else {
      delete updateData.kioskPassword;
    }

    if (updateData.hallDisplayPassword) {
      updateData.hallDisplayPassword = await bcrypt.hash(
        updateData.hallDisplayPassword,
        10
      );
    } else {
      delete updateData.hallDisplayPassword;
    }

    const branch = await Branch.findByIdAndUpdate(params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!branch) {
      return NextResponse.json(
        { message: "Branch not found" },
        { status: 404 }
      );
    }

    // Remove password fields from the response
    const branchResponse = branch.toObject();
    delete branchResponse.databasePassword;
    delete branchResponse.kioskPassword;
    delete branchResponse.hallDisplayPassword;

    return NextResponse.json(branchResponse);
  } catch (error) {
    console.error("Error updating branch:", error);
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
    const branch = await Branch.findByIdAndDelete(params.id);

    if (!branch) {
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
