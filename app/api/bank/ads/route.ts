import { NextResponse, type NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { Ad } from "@/lib/models/bank";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const segments = req.nextUrl.pathname.split("/");
  const lastSegment = segments[segments.length - 1];

  if (lastSegment === "ads") {
    // This is a request for all ads
    try {
      await dbConnect();
      const ads = await Ad.find({});
      return NextResponse.json(ads);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to fetch ads" },
        { status: 500 }
      );
    }
  } else {
    // This is a request for an image
    const filename = lastSegment;
    const filepath = path.join(process.cwd(), "uploads", filename);

    try {
      const file = await readFile(filepath);
      return new NextResponse(file, {
        headers: {
          "Content-Type": "image/*",
        },
      });
    } catch (error) {
      return new NextResponse("Image not found", { status: 404 });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const image = formData.get("image") as File;
    const branchId = formData.get("branchId") as string;

    if (!name || !image || !branchId) {
      return NextResponse.json(
        { error: "Name, branchId and image are required" },
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

    const newAd = new Ad({
      name,
      branchId,
      image: filename, // Store only the filename, not the full path
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
