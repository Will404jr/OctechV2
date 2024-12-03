import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { Settings } from "@/lib/models/hospital";
import dbConnect from "@/lib/db";

export async function GET() {
  try {
    await dbConnect();
    const settings = await Settings.findOne();
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const settingsData: Record<string, string> = {};

    for (const [key, value] of Array.from(formData.entries())) {
      if (key === "logoImage" && value instanceof Blob) {
        const buffer = Buffer.from(await value.arrayBuffer());
        const filename =
          Date.now() + "-logo" + path.extname(value.name || ".png");
        const filepath = path.join(
          process.cwd(),
          "public",
          "uploads",
          filename
        );
        await writeFile(filepath, buffer);
        settingsData[key] = `/uploads/${filename}`;
      } else {
        settingsData[key] = value.toString();
      }
    }

    const newSettings = new Settings(settingsData);
    await newSettings.save();

    return NextResponse.json(newSettings);
  } catch (error) {
    console.error("Error creating settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const settingsData: Record<string, string> = {};

    for (const [key, value] of Array.from(formData.entries())) {
      if (key === "logoImage" && value instanceof Blob) {
        const buffer = Buffer.from(await value.arrayBuffer());
        const filename =
          Date.now() + "-logo" + path.extname(value.name || ".png");
        const filepath = path.join(
          process.cwd(),
          "public",
          "uploads",
          filename
        );
        await writeFile(filepath, buffer);
        settingsData[key] = `/uploads/${filename}`;
      } else {
        settingsData[key] = value.toString();
      }
    }

    const updatedSettings = await Settings.findOneAndUpdate({}, settingsData, {
      new: true,
      upsert: true,
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
