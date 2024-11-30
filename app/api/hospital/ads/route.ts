import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ad } from "@/lib/models/hospital";

export async function GET() {
  try {
    await dbConnect();
    const ads = await Ad.find({});
    return NextResponse.json(ads);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();
    const ad = await Ad.create(data);
    return NextResponse.json(ad);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create ad" }, { status: 500 });
  }
}
