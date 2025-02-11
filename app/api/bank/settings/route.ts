import { type NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { BankSettings } from "@/lib/models/bank";
import dbConnect from "@/lib/db";
import bcrypt from "bcryptjs";

const setCorsHeaders = (res: NextResponse) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
};

export async function OPTIONS() {
  return setCorsHeaders(NextResponse.json({}));
}

export async function GET() {
  try {
    await dbConnect();
    const settings = await BankSettings.findOne().select(
      "-password -kioskPassword"
    );
    const response = NextResponse.json(settings);
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Error fetching settings:", error);
    const errorResponse = NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    let body;
    const contentType = req.headers.get("content-type");
    if (contentType && contentType.includes("multipart/form-data")) {
      body = await req.formData();
    } else {
      body = await req.json();
    }

    const settingsData: Record<string, any> = {};

    if (body instanceof FormData) {
      for (const [key, value] of Array.from(body.entries())) {
        if (key === "logoImage" && value instanceof Blob) {
          try {
            const buffer = Buffer.from(await value.arrayBuffer());
            const filename =
              Date.now() + "-logo" + path.extname(value.name || ".png");
            const uploadsDir = path.join(process.cwd(), "uploads");
            const filepath = path.join(uploadsDir, filename);

            // Create the uploads directory if it doesn't exist
            await mkdir(uploadsDir, { recursive: true });

            await writeFile(filepath, buffer);
            settingsData[key] = `/api/bank/settings/images/${filename}`;
          } catch (fileError) {
            console.error("Error saving logo file:", fileError);
            const errorResponse = NextResponse.json(
              { error: "Failed to save logo file" },
              { status: 500 }
            );
            return setCorsHeaders(errorResponse);
          }
        } else {
          settingsData[key] = value.toString();
        }
      }
    } else {
      Object.assign(settingsData, body);
    }

    let existingSettings = await BankSettings.findOne();
    if (existingSettings) {
      // Update existing settings
      Object.assign(existingSettings, settingsData);

      // Handle password updates separately
      if (body.password) {
        existingSettings.password = body.password;
      }
      if (body.kioskPassword) {
        existingSettings.kioskPassword = body.kioskPassword;
      }

      await existingSettings.save();
    } else {
      // Create new settings
      existingSettings = new BankSettings(settingsData);

      // Set passwords directly on the model instance
      if (body.password) {
        existingSettings.password = body.password;
      }
      if (body.kioskPassword) {
        existingSettings.kioskPassword = body.kioskPassword;
      }

      await existingSettings.save();
    }

    const response = NextResponse.json({
      message: "Settings saved successfully",
      settings: await BankSettings.findOne().select("-password -kioskPassword"),
    });
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Error saving settings:", error);
    const errorResponse = NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
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
        const uploadsDir = path.join(process.cwd(), "uploads");
        const filepath = path.join(uploadsDir, filename);

        // Create the uploads directory if it doesn't exist
        await mkdir(uploadsDir, { recursive: true });

        await writeFile(filepath, buffer);
        settingsData[key] = `/api/bank/settings/images/${filename}`;
      } else if (key === "password" || key === "kioskPassword") {
        if (value) {
          settingsData[key] = await bcrypt.hash(value.toString(), 10);
        }
      } else {
        settingsData[key] = value.toString();
      }
    }

    const updatedSettings = await BankSettings.findOneAndUpdate(
      {},
      settingsData,
      {
        new: true,
        upsert: true,
      }
    ).select("-password -kioskPassword");

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
