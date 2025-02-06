import { NextRequest, NextResponse } from "next/server";
import { HospitalSettings } from "@/lib/models/hospital";
import dbConnect from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { username, password } = await req.json();

    const settings = await HospitalSettings.findOne({});

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    if (username !== settings.kioskUsername) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await settings.compareKioskPassword(password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // If login is successful, you might want to create a session or token here
    return NextResponse.json(
      { message: "Kiosk login successful" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Kiosk login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
