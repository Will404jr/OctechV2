import { type NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { Error as MongooseError } from "mongoose";
import path from "path";
import { HospitalSettings } from "@/lib/models/hospital";
import dbConnect from "@/lib/db";
import bcrypt from "bcryptjs";

// CORS middleware
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  try {
    await dbConnect();
    const settings = await HospitalSettings.findOne().select(
      "-password -kioskPassword"
    );
    const response = NextResponse.json(settings);
    return setCorsHeaders(response);
  } catch (error) {
    const response = NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
    return setCorsHeaders(response);
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
            const filepath = path.join(
              process.cwd(),
              "public",
              "uploads",
              filename
            );
            await writeFile(filepath, buffer);
            settingsData[key] = `/uploads/${filename}`;
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

    let existingSettings = await HospitalSettings.findOne();
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
      existingSettings = new HospitalSettings(settingsData);

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
      settings: await HospitalSettings.findOne().select(
        "-password -kioskPassword"
      ),
    });
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Error saving settings:", error);

    if (error instanceof MongooseError.ValidationError) {
      const validationErrors: Record<string, string> = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      const errorResponse = NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 }
      );
      return setCorsHeaders(errorResponse);
    }

    const errorResponse = NextResponse.json(
      { error: "Failed to save settings. Please try again." },
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
        const filepath = path.join(
          process.cwd(),
          "public",
          "uploads",
          filename
        );
        await writeFile(filepath, buffer);
        settingsData[key] = `/uploads/${filename}`;
      } else if (key === "password" || key === "kioskPassword") {
        if (value) {
          settingsData[key] = await bcrypt.hash(value.toString(), 10);
        }
      } else {
        settingsData[key] = value.toString();
      }
    }

    const updatedSettings = await HospitalSettings.findOneAndUpdate(
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
