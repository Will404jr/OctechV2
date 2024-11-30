import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Role } from "@/lib/models/hospital";

export async function GET() {
  try {
    await dbConnect();
    const roles = await Role.find({});
    return NextResponse.json(roles);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();
    const role = await Role.create(data);
    return NextResponse.json(role);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
