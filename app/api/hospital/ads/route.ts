import { NextResponse, type NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { HospitalAd } from "@/lib/models/hospital";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    await dbConnect();
    const ads = await HospitalAd.find({}).sort({ createdAt: -1 });
    return NextResponse.json(ads);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const image = formData.get("image") as File;

    if (!name || !image) {
      return NextResponse.json(
        { error: "Name and image are required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const filename = Date.now() + "-" + image.name.replace(/\s/g, "-");
    const uploadsDir = path.join(process.cwd(), "uploads");
    const filepath = path.join(uploadsDir, filename);

    // Create the uploads directory if it doesn't exist
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }

    await writeFile(filepath, buffer);

    const newAd = new HospitalAd({
      name,
      image: `/api/hospital/ads/images/${filename}`,
    });

    await newAd.save();

    return NextResponse.json(newAd);
  } catch (error) {
    console.error("Error creating ad:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
