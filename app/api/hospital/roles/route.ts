import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Role } from "@/lib/models/hospital";
import mongoose from "mongoose";

export async function GET() {
  try {
    await dbConnect();
    const roles = await Role.find().lean();
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();

    // Ensure permissions are boolean values
    if (data.permissions) {
      for (const key in data.permissions) {
        data.permissions[key] = Boolean(data.permissions[key]);
      }
    }

    const newRole = new Role(data);
    await newRole.save();
    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        { error: "Validation Error", details: validationErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing role ID" }, { status: 400 });
    }

    const data = await request.json();

    // Ensure permissions are boolean values
    if (data.permissions) {
      for (const key in data.permissions) {
        data.permissions[key] = Boolean(data.permissions[key]);
      }
    }

    const updatedRole = await Role.findByIdAndUpdate(id, data, { new: true });
    if (!updatedRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing role ID" }, { status: 400 });
    }
    const deletedRole = await Role.findByIdAndDelete(id);
    if (!deletedRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
